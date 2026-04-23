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

function inferMotifDescription(rows, clusterLabel) {
    if (!rows.length) {
        return `Cluster ${clusterLabel} currently has no loaded structures.`;
    }

    const avgDelta =
        rows.reduce((sum, row) => sum + Number(row.delta_energy ?? 0), 0) / rows.length;

    const avgDisplacement =
        rows.reduce((sum, row) => sum + Number(row.displacement ?? 0), 0) / rows.length;

    const avgLower =
        rows.reduce((sum, row) => sum + Number(row.lower_rotation ?? 0), 0) / rows.length;

    const avgUpper =
        rows.reduce((sum, row) => sum + Number(row.upper_rotation ?? 0), 0) / rows.length;

    let stabilityText = "moderate stability";
    if (avgDelta < 0.15) {
        stabilityText = "high stability";
    } else if (avgDelta > 0.45) {
        stabilityText = "lower stability";
    }

    let displacementText = "moderate layer shift";
    if (avgDisplacement < 2) {
        displacementText = "compact stacking";
    } else if (avgDisplacement > 5) {
        displacementText = "larger lateral shift";
    }

    return `Cluster ${clusterLabel} appears to represent a motif family with ${stabilityText}, ${displacementText}, and typical lower/upper rotations around ${avgLower.toFixed(
        1
    )}° and ${avgUpper.toFixed(1)}°.`;
}

export default function MotifExplorer() {
    const [clusterLabel, setClusterLabel] = useState("2");
    const [inputLabel, setInputLabel] = useState("2");
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [selectedRepId, setSelectedRepId] = useState("");
    const [selectedRepCif, setSelectedRepCif] = useState("");
    const [repLoading, setRepLoading] = useState(false);
    const [repError, setRepError] = useState("");

    async function loadCluster(label) {
        try {
            setLoading(true);
            setError("");
            setRows([]);
            setSelectedRepId("");
            setSelectedRepCif("");
            setRepError("");

            const result = await fetchJson(`/cluster/${encodeURIComponent(label)}?limit=100`);
            setRows(result);
            setClusterLabel(label);

            if (result.length > 0) {
                const sortedByDelta = [...result].sort(
                    (a, b) => Number(a.delta_energy ?? 0) - Number(b.delta_energy ?? 0)
                );
                setSelectedRepId(sortedByDelta[0].structure_id);
            }
        } catch (err) {
            setRows([]);
            setError(err.message || "Failed to load motif cluster");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadCluster(clusterLabel);
    }, []);

    useEffect(() => {
        if (!selectedRepId) return;

        let cancelled = false;

        async function loadRepresentativeCif() {
            try {
                setRepLoading(true);
                setRepError("");
                setSelectedRepCif("");

                const text = await fetchStructureCif(selectedRepId);

                if (!cancelled) {
                    setSelectedRepCif(text);
                }
            } catch (err) {
                if (!cancelled) {
                    setRepError("Could not load representative CIF.");
                }
            } finally {
                if (!cancelled) {
                    setRepLoading(false);
                }
            }
        }

        loadRepresentativeCif();

        return () => {
            cancelled = true;
        };
    }, [selectedRepId]);

    const summary = useMemo(() => {
        if (!rows.length) {
            return {
                clusterSize: 0,
                avgEnergy: "-",
                avgDelta: "-",
                minDelta: "-",
                motifDescription: inferMotifDescription([], clusterLabel),
                representatives: [],
            };
        }

        const numericEnergy = rows.map((r) => Number(r.energy ?? 0));
        const numericDelta = rows.map((r) => Number(r.delta_energy ?? 0));

        const avgEnergy =
            numericEnergy.reduce((sum, value) => sum + value, 0) / numericEnergy.length;

        const avgDelta =
            numericDelta.reduce((sum, value) => sum + value, 0) / numericDelta.length;

        const minDelta = Math.min(...numericDelta);

        const representatives = [...rows]
            .sort((a, b) => Number(a.delta_energy ?? 0) - Number(b.delta_energy ?? 0))
            .slice(0, 3);

        return {
            clusterSize: rows.length,
            avgEnergy: avgEnergy.toFixed(4),
            avgDelta: avgDelta.toFixed(4),
            minDelta: minDelta.toFixed(4),
            motifDescription: inferMotifDescription(rows, clusterLabel),
            representatives,
        };
    }, [rows, clusterLabel]);

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="flex flex-col gap-3 p-5 md:flex-row">
                    <Input
                        value={inputLabel}
                        onChange={(e) => setInputLabel(e.target.value)}
                        placeholder="Enter cluster label"
                    />
                    <Button onClick={() => loadCluster(inputLabel)}>
                        Load Motif Cluster
                    </Button>
                </CardContent>
            </Card>

            {loading ? <p className="text-sm text-slate-500">Loading motif cluster...</p> : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label="Cluster Size"
                    value={summary.clusterSize}
                    hint="Number of loaded members"
                />
                <MetricCard
                    label="Average Energy"
                    value={summary.avgEnergy}
                    hint="Mean raw energy"
                />
                <MetricCard
                    label="Average ΔE"
                    value={summary.avgDelta}
                    hint="Mean stability indicator"
                />
                <MetricCard
                    label="Best ΔE"
                    value={summary.minDelta}
                    hint="Lowest delta energy in cluster"
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Motif Description</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-6 text-slate-600">
                    {summary.motifDescription}
                </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_1.6fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>Representative Structures</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {summary.representatives.length === 0 ? (
                            <p className="text-sm text-slate-500">No representative structures available.</p>
                        ) : (
                            summary.representatives.map((row, index) => {
                                const isSelected = selectedRepId === row.structure_id;

                                return (
                                    <button
                                        key={row.structure_id}
                                        onClick={() => setSelectedRepId(row.structure_id)}
                                        className={`w-full rounded-xl border p-5 text-left transition-all duration-300 ${isSelected ? "border-brand-500 bg-brand-50/50 shadow-md ring-1 ring-brand-500" : "border-slate-200/60 bg-white/50 hover:bg-white hover:shadow-sm hover:border-slate-300"
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    Representative {index + 1}
                                                </p>
                                                <p className="mt-1 text-sm text-slate-700">{row.structure_id}</p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Lower {row.lower_rotation}° · Disp {row.displacement} · Upper {row.upper_rotation}°
                                                </p>
                                            </div>

                                            <div className="text-right text-xs text-slate-500">
                                                <p>ΔE</p>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {row.delta_energy}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    {repLoading ? (
                        <Card>
                            <CardContent className="p-8 text-sm text-slate-500">
                                Loading representative structure...
                            </CardContent>
                        </Card>
                    ) : repError ? (
                        <Card>
                            <CardContent className="p-8 text-sm text-red-600">
                                {repError}
                            </CardContent>
                        </Card>
                    ) : selectedRepCif ? (
                        <CIFViewer3D
                            cifText={selectedRepCif}
                            structureId={selectedRepId}
                            colorMode="atom"
                            height={520}
                        />
                    ) : (
                        <Card>
                            <CardContent className="p-8 text-sm text-slate-500">
                                Select a representative structure to inspect.
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Motif Member List</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead>
                            <tr className="border-b text-slate-500">
                                <th className="py-2 pr-4">Structure</th>
                                <th className="py-2 pr-4">Energy</th>
                                <th className="py-2 pr-4">ΔE</th>
                                <th className="py-2 pr-4">Confidence</th>
                                <th className="py-2 pr-4">Lower</th>
                                <th className="py-2 pr-4">Disp</th>
                                <th className="py-2 pr-4">Upper</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr
                                    key={row.structure_id}
                                    className={`border-b border-slate-100 last:border-0 transition-colors ${selectedRepId === row.structure_id ? "bg-brand-50/50" : "hover:bg-slate-50/50"
                                        }`}
                                >
                                    <td className="py-2 pr-4">
                                        <button
                                            onClick={() => setSelectedRepId(row.structure_id)}
                                            className="text-left font-medium text-slate-900 hover:underline"
                                        >
                                            {row.structure_id}
                                        </button>
                                    </td>
                                    <td className="py-2 pr-4">{row.energy}</td>
                                    <td className="py-2 pr-4">{row.delta_energy}</td>
                                    <td className="py-2 pr-4">{String(row.confidence)}</td>
                                    <td className="py-2 pr-4">{row.lower_rotation}</td>
                                    <td className="py-2 pr-4">{row.displacement}</td>
                                    <td className="py-2 pr-4">{row.upper_rotation}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}