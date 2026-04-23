from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

router = APIRouter()

PROJECT_ROOT = Path(r"D:\masters_project")
MASTER_CSV = PROJECT_ROOT / "outputs" / "dataset_master.csv"

df_master = pd.read_csv(MASTER_CSV)

@router.get("/structure/{structure_id}/cif", response_class=PlainTextResponse)
def get_structure_cif(structure_id: str):
    row = df_master[df_master["structure_id"] == structure_id]

    if row.empty:
        raise HTTPException(status_code=404, detail="Structure not found")

    relative_cif_path = row.iloc[0]["relative_cif_path"]
    cif_path = PROJECT_ROOT / relative_cif_path

    if not cif_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"CIF file not found at: {cif_path}"
        )

    return cif_path.read_text(encoding="utf-8", errors="ignore")