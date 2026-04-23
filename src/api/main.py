from __future__ import annotations

import json
from typing import Annotated, Generator, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from pathlib import Path

PROJECT_ROOT = Path(r"d:\masters_project")

from src.db.schema import (
    ClusterAssignment,
    Embedding,
    EmbeddingMapPoint,
    MotifSummary,
    Neighbor,
    Structure,
    get_session_factory,
)
from src.models.inference import infer_embedding_for_structure

app = FastAPI(
    title="Polymer Stacking Discovery API",
    description="Backend API for agarose polymer structure metadata, embeddings, clusters, and search.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SessionLocal = get_session_factory()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DbSession = Annotated[Session, Depends(get_db)]

class InferenceEmbeddingResponse(BaseModel):
    structure_id: str
    embedding_dim: int
    embedding: list[float]

class StructureListItem(BaseModel):
    structure_id: str
    relative_cif_path: str
    lower_rotation: float
    displacement: float
    upper_rotation: float
    energy: float
    stable_energy: float
    delta_energy: float


class StructureDetailResponse(BaseModel):
    structure_id: str
    relative_cif_path: str
    lower_rotation: float
    displacement: float
    upper_rotation: float
    energy: float
    stable_energy: float
    delta_energy: float
    cluster_label: Optional[int]
    cluster_confidence: Optional[float]
    embedding_dim: Optional[int]
    embedding: Optional[list[float]]


class ClusterStructureItem(BaseModel):
    structure_id: str
    relative_cif_path: str
    delta_energy: float
    energy: float
    cluster_label: int
    confidence: Optional[float]


class NeighborItem(BaseModel):
    neighbor_structure_id: str
    rank: int
    similarity_score: float
    distance_metric: str


class EmbeddingMapItem(BaseModel):
    structure_id: str
    method: str
    x: float
    y: float
    cluster_label: Optional[int]
    delta_energy: Optional[float]

class MapPointResponse(BaseModel):
    method: str
    x: float
    y: float


class StructureNeighborResponse(BaseModel):
    neighbor_structure_id: str
    rank: int
    similarity_score: float
    distance_metric: str
    cluster_label: Optional[int]
    delta_energy: Optional[float]
    relative_cif_path: Optional[str]


class StructureViewResponse(BaseModel):
    structure_id: str
    relative_cif_path: str
    lower_rotation: float
    displacement: float
    upper_rotation: float
    energy: float
    stable_energy: float
    delta_energy: float
    cluster_label: Optional[int]
    cluster_confidence: Optional[float]
    map_points: list[MapPointResponse]
    neighbors: list[StructureNeighborResponse]


class SearchResultItem(BaseModel):
    structure_id: str
    relative_cif_path: str
    lower_rotation: float
    displacement: float
    upper_rotation: float
    energy: float
    delta_energy: float
    cluster_label: Optional[int]
    umap_x: Optional[float]
    umap_y: Optional[float]

class MotifSummaryItem(BaseModel):
    cluster_label: int
    motif_name: str
    mean_delta_energy: float
    description: Optional[str]


def parse_embedding_json(embedding_json: Optional[str]) -> Optional[list[float]]:
    if not embedding_json:
        return None
    return json.loads(embedding_json)

@app.get("/infer-embedding/{structure_id}", response_model=InferenceEmbeddingResponse)
def infer_embedding(structure_id: str, db: DbSession):
    structure = (
        db.query(Structure)
        .filter(Structure.structure_id == structure_id)
        .first()
    )
    if structure is None:
        raise HTTPException(status_code=404, detail="Structure not found")

    try:
        embedding = infer_embedding_for_structure(structure_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Processed graph not found for structure")
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

    return InferenceEmbeddingResponse(
        structure_id=structure_id,
        embedding_dim=len(embedding),
        embedding=embedding,
    )

@app.get("/")
def root() -> dict:
    return {"message": "Polymer Stacking Discovery API is running."}


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/structures", response_model=list[StructureListItem])
def get_structures(
    db: DbSession,
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    rows = (
        db.query(Structure)
        .order_by(Structure.structure_id)
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [
        StructureListItem(
            structure_id=row.structure_id,
            relative_cif_path=row.relative_cif_path,
            lower_rotation=row.lower_rotation,
            displacement=row.displacement,
            upper_rotation=row.upper_rotation,
            energy=row.energy,
            stable_energy=row.stable_energy,
            delta_energy=row.delta_energy,
        )
        for row in rows
    ]


@app.get("/structure/{structure_id}", response_model=StructureDetailResponse)
def get_structure(structure_id: str, db: DbSession):
    structure = (
        db.query(Structure)
        .filter(Structure.structure_id == structure_id)
        .first()
    )
    if structure is None:
        raise HTTPException(status_code=404, detail="Structure not found")

    cluster = (
        db.query(ClusterAssignment)
        .filter(ClusterAssignment.structure_id == structure_id)
        .first()
    )

    embedding = (
        db.query(Embedding)
        .filter(Embedding.structure_id == structure_id)
        .first()
    )

    return StructureDetailResponse(
        structure_id=structure.structure_id,
        relative_cif_path=structure.relative_cif_path,
        lower_rotation=structure.lower_rotation,
        displacement=structure.displacement,
        upper_rotation=structure.upper_rotation,
        energy=structure.energy,
        stable_energy=structure.stable_energy,
        delta_energy=structure.delta_energy,
        cluster_label=cluster.cluster_label if cluster else None,
        cluster_confidence=cluster.confidence if cluster else None,
        embedding_dim=embedding.embedding_dim if embedding else None,
        embedding=parse_embedding_json(embedding.embedding_json) if embedding else None,
    )


@app.get("/structure/{structure_id}/cif", response_class=PlainTextResponse)
def get_structure_cif(structure_id: str, db: DbSession):
    structure = (
        db.query(Structure)
        .filter(Structure.structure_id == structure_id)
        .first()
    )
    if structure is None:
        raise HTTPException(status_code=404, detail="Structure not found")

    cif_path = PROJECT_ROOT / "data" / structure.relative_cif_path

    if not cif_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"CIF file not found at: {cif_path}"
        )

    return cif_path.read_text(encoding="utf-8", errors="ignore")


@app.get("/cluster/{cluster_label}", response_model=list[ClusterStructureItem])
def get_cluster(
    cluster_label: int,
    db: DbSession,
    limit: int = Query(default=200, ge=1, le=1000),
):
    rows = (
        db.query(Structure, ClusterAssignment)
        .join(
            ClusterAssignment,
            Structure.structure_id == ClusterAssignment.structure_id,
        )
        .filter(ClusterAssignment.cluster_label == cluster_label)
        .order_by(Structure.delta_energy.asc())
        .limit(limit)
        .all()
    )

    if not rows:
        raise HTTPException(status_code=404, detail="Cluster not found or empty")

    return [
        ClusterStructureItem(
            structure_id=structure.structure_id,
            relative_cif_path=structure.relative_cif_path,
            delta_energy=structure.delta_energy,
            energy=structure.energy,
            cluster_label=cluster.cluster_label,
            confidence=cluster.confidence,
        )
        for structure, cluster in rows
    ]


@app.get("/neighbors/{structure_id}", response_model=list[NeighborItem])
def get_neighbors(
    structure_id: str,
    db: DbSession,
    limit: int = Query(default=10, ge=1, le=100),
):
    structure_exists = (
        db.query(Structure)
        .filter(Structure.structure_id == structure_id)
        .first()
    )
    if structure_exists is None:
        raise HTTPException(status_code=404, detail="Structure not found")

    rows = (
        db.query(Neighbor)
        .filter(Neighbor.query_structure_id == structure_id)
        .order_by(Neighbor.rank.asc())
        .limit(limit)
        .all()
    )

    return [
        NeighborItem(
            neighbor_structure_id=row.neighbor_structure_id,
            rank=row.rank,
            similarity_score=row.similarity_score,
            distance_metric=row.distance_metric,
        )
        for row in rows
    ]


@app.get("/embedding-map", response_model=list[EmbeddingMapItem])
def get_embedding_map(
    db: DbSession,
    method: str = Query(default="umap", pattern="^(umap|pca|tsne)$"),
    limit: int = Query(default=5000, ge=1, le=10000),
):
    rows = (
        db.query(EmbeddingMapPoint, Structure, ClusterAssignment)
        .join(
            Structure,
            EmbeddingMapPoint.structure_id == Structure.structure_id,
        )
        .outerjoin(
            ClusterAssignment,
            EmbeddingMapPoint.structure_id == ClusterAssignment.structure_id,
        )
        .filter(EmbeddingMapPoint.method == method)
        .limit(limit)
        .all()
    )

    return [
        EmbeddingMapItem(
            structure_id=map_point.structure_id,
            method=map_point.method,
            x=map_point.x,
            y=map_point.y,
            cluster_label=cluster.cluster_label if cluster else None,
            delta_energy=structure.delta_energy,
        )
        for map_point, structure, cluster in rows
    ]


@app.get("/motif-summary", response_model=list[MotifSummaryItem])
def get_motif_summary(db: DbSession):
    rows = (
        db.query(MotifSummary)
        .order_by(MotifSummary.mean_delta_energy.asc())
        .all()
    )

    return [
        MotifSummaryItem(
            cluster_label=row.cluster_label,
            motif_name=row.motif_name,
            mean_delta_energy=row.mean_delta_energy,
            description=row.description,
        )
        for row in rows
    ]

@app.get("/structure-view/{structure_id}", response_model=StructureViewResponse)
def get_structure_view(
    structure_id: str,
    db: DbSession,
    neighbor_limit: int = Query(default=10, ge=1, le=50),
):
    structure = (
        db.query(Structure)
        .filter(Structure.structure_id == structure_id)
        .first()
    )
    if structure is None:
        raise HTTPException(status_code=404, detail="Structure not found")

    cluster = (
        db.query(ClusterAssignment)
        .filter(ClusterAssignment.structure_id == structure_id)
        .first()
    )

    map_rows = (
        db.query(EmbeddingMapPoint)
        .filter(EmbeddingMapPoint.structure_id == structure_id)
        .order_by(EmbeddingMapPoint.method.asc())
        .all()
    )

    neighbor_rows = (
        db.query(Neighbor, Structure, ClusterAssignment)
        .join(
            Structure,
            Neighbor.neighbor_structure_id == Structure.structure_id,
        )
        .outerjoin(
            ClusterAssignment,
            Neighbor.neighbor_structure_id == ClusterAssignment.structure_id,
        )
        .filter(Neighbor.query_structure_id == structure_id)
        .order_by(Neighbor.rank.asc())
        .limit(neighbor_limit)
        .all()
    )

    neighbors = [
        StructureNeighborResponse(
            neighbor_structure_id=neighbor.neighbor_structure_id,
            rank=neighbor.rank,
            similarity_score=neighbor.similarity_score,
            distance_metric=neighbor.distance_metric,
            cluster_label=neighbor_cluster.cluster_label if neighbor_cluster else None,
            delta_energy=neighbor_structure.delta_energy,
            relative_cif_path=neighbor_structure.relative_cif_path,
        )
        for neighbor, neighbor_structure, neighbor_cluster in neighbor_rows
    ]

    map_points = [
        MapPointResponse(
            method=row.method,
            x=row.x,
            y=row.y,
        )
        for row in map_rows
    ]

    return StructureViewResponse(
        structure_id=structure.structure_id,
        relative_cif_path=structure.relative_cif_path,
        lower_rotation=structure.lower_rotation,
        displacement=structure.displacement,
        upper_rotation=structure.upper_rotation,
        energy=structure.energy,
        stable_energy=structure.stable_energy,
        delta_energy=structure.delta_energy,
        cluster_label=cluster.cluster_label if cluster else None,
        cluster_confidence=cluster.confidence if cluster else None,
        map_points=map_points,
        neighbors=neighbors,
    )


@app.get("/search", response_model=list[SearchResultItem])
def search_structures(
    db: DbSession,
    q: Optional[str] = Query(default=None),
    cluster_label: Optional[int] = Query(default=None),
    min_delta_energy: Optional[float] = Query(default=None),
    max_delta_energy: Optional[float] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
):
    query = (
        db.query(Structure, ClusterAssignment, EmbeddingMapPoint)
        .outerjoin(
            ClusterAssignment,
            Structure.structure_id == ClusterAssignment.structure_id,
        )
        .outerjoin(
            EmbeddingMapPoint,
            (Structure.structure_id == EmbeddingMapPoint.structure_id)
            & (EmbeddingMapPoint.method == "umap"),
        )
    )

    if q:
        like_pattern = f"%{q}%"
        query = query.filter(
            (Structure.structure_id.ilike(like_pattern))
            | (Structure.relative_cif_path.ilike(like_pattern))
        )

    if cluster_label is not None:
        query = query.filter(ClusterAssignment.cluster_label == cluster_label)

    if min_delta_energy is not None:
        query = query.filter(Structure.delta_energy >= min_delta_energy)

    if max_delta_energy is not None:
        query = query.filter(Structure.delta_energy <= max_delta_energy)

    rows = (
        query.order_by(Structure.delta_energy.asc())
        .limit(limit)
        .all()
    )

    return [
        SearchResultItem(
            structure_id=structure.structure_id,
            relative_cif_path=structure.relative_cif_path,
            lower_rotation=structure.lower_rotation,
            displacement=structure.displacement,
            upper_rotation=structure.upper_rotation,
            energy=structure.energy,
            delta_energy=structure.delta_energy,
            cluster_label=cluster.cluster_label if cluster else None,
            umap_x=map_point.x if map_point else None,
            umap_y=map_point.y if map_point else None,
        )
        for structure, cluster, map_point in rows
    ]