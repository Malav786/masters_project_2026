import { useEffect, useMemo, useState } from "react";
import CIFViewer3D from "../components/structure/CIFViewer3D";
import { fetchStructureCif } from "../lib/api";

const API_BASE_URL = "http://127.0.0.1:8000";

async function fetchJson(path) {
    const response = await fetch(`${API_BASE_URL}${path}`);

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
}

function Card({ children, className = "" }) {
    return <div className={`glass-card ${className}`}>{children}</div>;
}

function CardHeader({ children, className = "" }) {
    return <div className={`border-b border-slate-200/50 p-5 ${className}`}>{children}</div>;
}

function CardTitle({ children, className = "" }) {
    return <h2 className={`font-display text-lg font-semibold text-slate-800 tracking-tight ${className}`}>{children}</h2>;
}

function CardContent({ children, className = "" }) {
    return <div className={`p-5 ${className}`}>{children}</div>;
}

function Button({ children, className = "", variant = "primary", ...props }) {
    const baseClass = variant === "primary" ? "btn-primary" : "btn-secondary";
    return (
        <button
            {...props}
            className={`${baseClass} ${className}`}
        >
            {children}
        </button>
    );
}

function Input(props) {
    return <input {...props} className="input-field" />;
}

function MetricCard({ label, value, hint }) {
    return (
        <Card>
            <CardContent className="p-6">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{label}</p>
                <p className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900">{value}</p>
                {hint ? <p className="mt-1.5 text-xs font-medium text-slate-400">{hint}</p> : null}
            </CardContent>
        </Card>
    );
}

function formatValue(value, digits = 4) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(digits) : "-";
}

export default function SimilaritySearch() {
    const [structureId, setStructureId] = useState("L0_D0_U0");
    const [inputStructureId, setInputStructureId] = useState("L0_D0_U0");
    const [neighborLimit, setNeighborLimit] = useState(5);

    const [neighbors, setNeighbors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [queryCif, setQueryCif] = useState("");
    const [queryCifLoading, setQueryCifLoading] = useState(false);
    const [queryCifError, setQueryCifError] = useState("");

    const [selectedNeighborId, setSelectedNeighborId] = useState("");
    const [selectedNeighborCif, setSelectedNeighborCif] = useState("");
    const [neighborCifLoading, setNeighborCifLoading] = useState(false);
    const [neighborCifError, setNeighborCifError] = useState("");

    async function loadNeighbors(nextStructureId = structureId, nextLimit = neighborLimit) {
        try {
            setLoading(true);
            setError("");
            setNeighbors([]);
            setSelectedNeighborId("");
            setSelectedNeighborCif("");
            setNeighborCifError("");

            const result = await fetchJson(
                `/neighbors/${encodeURIComponent(nextStructureId)}?limit=${nextLimit}`
            );

            setNeighbors(result);
            setStructureId(nextStructureId);

            if (result.length > 0) {
                setSelectedNeighborId(result[0].neighbor_structure_id);
            }
        } catch (err) {
            setNeighbors([]);
            setError(err.message || "Failed to load neighbors");
            setSelectedNeighborId("");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadNeighbors("L0_D0_U0", 5);
    }, []);

    useEffect(() => {
        if (!structureId) return;

        let cancelled = false;

        async function loadQueryCif() {
            try {
                setQueryCifLoading(true);
                setQueryCifError("");
                setQueryCif("");

                const text = await fetchStructureCif(structureId);

                if (!cancelled) {
                    setQueryCif(text);
                }
            } catch (err) {
                if (!cancelled) {
                    setQueryCifError("Could not load query structure CIF.");
                }
            } finally {
                if (!cancelled) {
                    setQueryCifLoading(false);
                }
            }
        }

        loadQueryCif();

        return () => {
            cancelled = true;
        };
    }, [structureId]);

    useEffect(() => {
        if (!selectedNeighborId) return;

        let cancelled = false;

        async function loadNeighborCif() {
            try {
                setNeighborCifLoading(true);
                setNeighborCifError("");
                setSelectedNeighborCif("");

                const text = await fetchStructureCif(selectedNeighborId);

                if (!cancelled) {
                    setSelectedNeighborCif(text);
                }
            } catch (err) {
                if (!cancelled) {
                    setNeighborCifError("Could not load neighbor CIF.");
                }
            } finally {
                if (!cancelled) {
                    setNeighborCifLoading(false);
                }
            }
        }

        loadNeighborCif();

        return () => {
            cancelled = true;
        };
    }, [selectedNeighborId]);

    const selectedNeighbor = useMemo(() => {
        return neighbors.find((row) => row.neighbor_structure_id === selectedNeighborId) || null;
    }, [neighbors, selectedNeighborId]);

    const similaritySummary = useMemo(() => {
        if (!neighbors.length) {
            return {
                topScore: "-",
                avgScore: "-",
                queryCluster: "-",
                selectedDelta: "-",
            };
        }

        const scores = neighbors
            .map((row) => Number(row.similarity_score))
            .filter((value) => Number.isFinite(value));

        const avgScore =
            scores.length > 0
                ? scores.reduce((sum, value) => sum + value, 0) / scores.length
                : null;

        return {
            topScore: formatValue(scores[0], 4),
            avgScore: avgScore === null ? "-" : formatValue(avgScore, 4),
            queryCluster: selectedNeighbor ? String(selectedNeighbor.cluster_label ?? "-") : "-",
            selectedDelta: selectedNeighbor ? formatValue(selectedNeighbor.delta_energy, 4) : "-",
        };
    }, [neighbors, selectedNeighbor]);

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="flex flex-col gap-3 p-5 lg:flex-row">
                    <Input
                        value={inputStructureId}
                        onChange={(e) => setInputStructureId(e.target.value)}
                        placeholder="Enter query structure ID"
                    />

                    <select
                        value={neighborLimit}
                        onChange={(e) => setNeighborLimit(Number(e.target.value))}
                        className="input-field max-w-xs"
                    >
                        <option value={5}>Top 5 neighbors</option>
                        <option value={10}>Top 10 neighbors</option>
                    </select>

                    <Button onClick={() => loadNeighbors(inputStructureId, neighborLimit)}>
                        Run Similarity Search
                    </Button>
                </CardContent>
            </Card>

            {loading ? <p className="text-sm text-slate-500">Loading similarity results...</p> : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label="Query Structure"
                    value={structureId || "-"}
                    hint="Current similarity anchor"
                />
                <MetricCard
                    label="Top Similarity"
                    value={similaritySummary.topScore}
                    hint="Best neighbor score"
                />
                <MetricCard
                    label="Average Similarity"
                    value={similaritySummary.avgScore}
                    hint="Across returned neighbors"
                />
                <MetricCard
                    label="Selected Neighbor ΔE"
                    value={similaritySummary.selectedDelta}
                    hint="Energy of highlighted neighbor"
                />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Query Structure</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {queryCifLoading ? (
                            <p className="text-sm text-slate-500">Loading query structure...</p>
                        ) : queryCifError ? (
                            <p className="text-sm text-red-600">{queryCifError}</p>
                        ) : queryCif ? (
                            <CIFViewer3D
                                cifText={queryCif}
                                structureId={structureId}
                                colorMode="atom"
                                height={460}
                            />
                        ) : (
                            <p className="text-sm text-slate-500">No query structure selected.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Selected Neighbor</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {neighborCifLoading ? (
                            <p className="text-sm text-slate-500">Loading selected neighbor...</p>
                        ) : neighborCifError ? (
                            <p className="text-sm text-red-600">{neighborCifError}</p>
                        ) : selectedNeighborCif ? (
                            <CIFViewer3D
                                cifText={selectedNeighborCif}
                                structureId={selectedNeighborId}
                                colorMode="atom"
                                height={460}
                            />
                        ) : (
                            <p className="text-sm text-slate-500">Select a neighbor to compare.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>Top-K Neighbors</CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead>
                                <tr className="border-b text-slate-500">
                                    <th className="py-2 pr-4">Neighbor</th>
                                    <th className="py-2 pr-4">Rank</th>
                                    <th className="py-2 pr-4">Similarity</th>
                                    <th className="py-2 pr-4">Cluster</th>
                                    <th className="py-2 pr-4">ΔE</th>
                                    <th className="py-2 pr-4">Metric</th>
                                </tr>
                            </thead>
                            <tbody>
                                {neighbors.map((row) => {
                                    const isSelected = row.neighbor_structure_id === selectedNeighborId;

                                    return (
                                        <tr
                                            key={`${row.neighbor_structure_id}-${row.rank}`}
                                            className={`border-b last:border-0 ${isSelected ? "bg-slate-50" : ""}`}
                                        >
                                            <td className="py-2 pr-4">
                                                <button
                                                    onClick={() => setSelectedNeighborId(row.neighbor_structure_id)}
                                                    className="text-left font-medium text-slate-900 hover:underline"
                                                >
                                                    {row.neighbor_structure_id}
                                                </button>
                                            </td>
                                            <td className="py-2 pr-4">{row.rank}</td>
                                            <td className="py-2 pr-4">{formatValue(row.similarity_score, 4)}</td>
                                            <td className="py-2 pr-4">{String(row.cluster_label ?? "-")}</td>
                                            <td className="py-2 pr-4">{formatValue(row.delta_energy, 4)}</td>
                                            <td className="py-2 pr-4">{row.distance_metric || "-"}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Neighbor Comparison Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-600">
                        {!selectedNeighbor ? (
                            <p>Select a neighbor from the table to inspect its similarity and energy.</p>
                        ) : (
                            <>
                                <div className="rounded-xl border p-3">
                                    <p className="font-medium text-slate-900">Selected Neighbor</p>
                                    <p className="mt-1">{selectedNeighbor.neighbor_structure_id}</p>
                                </div>

                                <div className="rounded-xl border p-3">
                                    <p className="font-medium text-slate-900">Similarity Score</p>
                                    <p className="mt-1">{formatValue(selectedNeighbor.similarity_score, 4)}</p>
                                </div>

                                <div className="rounded-xl border p-3">
                                    <p className="font-medium text-slate-900">Energy Profile</p>
                                    <p className="mt-1">ΔE: {formatValue(selectedNeighbor.delta_energy, 4)}</p>
                                    <p className="mt-1">Cluster: {String(selectedNeighbor.cluster_label ?? "-")}</p>
                                </div>

                                <div className="rounded-xl border p-3">
                                    <p className="font-medium text-slate-900">Interpretation</p>
                                    <p className="mt-1">
                                        This neighbor is close in embedding space to the query structure, so it likely
                                        shares a similar stacking motif or geometric arrangement.
                                    </p>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}