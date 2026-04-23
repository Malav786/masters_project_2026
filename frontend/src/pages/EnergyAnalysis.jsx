import { useEffect, useMemo, useState } from "react";

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

function finiteNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function mean(values) {
    if (!values.length) return null;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function quantile(sortedValues, q) {
    if (!sortedValues.length) return null;
    if (sortedValues.length === 1) return sortedValues[0];

    const pos = (sortedValues.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;

    if (sortedValues[base + 1] !== undefined) {
        return sortedValues[base] + rest * (sortedValues[base + 1] - sortedValues[base]);
    }

    return sortedValues[base];
}

function formatNumber(value, digits = 4) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
    return Number(value).toFixed(digits);
}

function buildHistogram(values, binCount = 20) {
    if (!values.length) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);

    if (min === max) {
        return [
            {
                x0: min,
                x1: max,
                count: values.length,
            },
        ];
    }

    const width = (max - min) / binCount;
    const bins = Array.from({ length: binCount }, (_, i) => ({
        x0: min + i * width,
        x1: min + (i + 1) * width,
        count: 0,
    }));

    for (const value of values) {
        let idx = Math.floor((value - min) / width);
        if (idx === binCount) idx = binCount - 1;
        bins[idx].count += 1;
    }

    return bins;
}

function getEnergyColor(value, minValue, maxValue) {
    if (!Number.isFinite(value) || !Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
        return "rgb(100 116 139)";
    }

    const span = maxValue - minValue || 1;
    const t = Math.max(0, Math.min(1, (value - minValue) / span));

    const r = Math.round(59 + t * (239 - 59));
    const g = Math.round(130 + t * (68 - 130));
    const b = Math.round(246 + t * (68 - 246));

    return `rgb(${r} ${g} ${b})`;
}

function HistogramChart({ values, title, summary="Displays the frequency distribution of stabilization energy (ΔE) across the dataset. A peak indicates the most typical stability range." }) {
    const bins = useMemo(() => buildHistogram(values, 24), [values]);
    const width = 760;
    const height = 320;
    const padding = 50;

    const maxCount = bins.length ? Math.max(...bins.map((b) => b.count)) : 1;

    return (
        <Card className="group relative">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto relative min-h-[340px]">
                {bins.length === 0 ? (
                    <p className="text-sm text-slate-500">No data available.</p>
                ) : (
                    <svg width={width} height={height} className="rounded-xl border border-slate-200/50 bg-white/50 backdrop-blur-sm">
                        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#cbd5e1" />
                        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#cbd5e1" />
                        
                        <text x={width / 2} y={height - 15} textAnchor="middle" className="text-xs fill-slate-500 font-medium tracking-wide shadow-sm">ΔE (Energy Difference)</text>
                        <text x={18} y={height / 2} textAnchor="middle" transform={`rotate(-90, 18, ${height/2})`} className="text-xs fill-slate-500 font-medium tracking-wide shadow-sm">Number of Structures</text>

                        {bins.map((bin, i) => {
                            const chartWidth = width - padding * 2;
                            const barWidth = chartWidth / bins.length - 2;
                            const x = padding + i * (chartWidth / bins.length) + 1;
                            const barHeight = maxCount ? (bin.count / maxCount) * (height - padding * 2) : 0;
                            const y = height - padding - barHeight;

                            return (
                                <g key={`${bin.x0}-${bin.x1}`}>
                                    <rect
                                        x={x}
                                        y={y}
                                        width={Math.max(1, barWidth)}
                                        height={barHeight}
                                        rx="4"
                                        fill="rgba(124, 58, 237, 0.75)"
                                        className="transition-all hover:fill-brand-600 hover:opacity-100 cursor-pointer"
                                    />
                                    <title>
                                        {`${bin.x0.toFixed(3)} to ${bin.x1.toFixed(3)} : ${bin.count} structures`}
                                    </title>
                                </g>
                            );
                        })}
                    </svg>
                )}
                <div className="absolute top-8 right-8 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                   <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-xl shadow-glass border border-slate-200/60 max-w-[240px]">
                      <p className="font-semibold text-slate-800 text-xs tracking-tight">Graph Overview</p>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{summary}</p>
                   </div>
                </div>
            </CardContent>
        </Card>
    );
}

function EnergyScatter({ points, title, summary="Visualizes structural embeddings colored heavily by their delta energy. Darker blue indicates higher stability (low ΔE), while darker red reveals correspondingly lower stability." }) {
    const width = 760;
    const height = 420;
    const padding = 50;

    const valid = (points || []).filter(
        (p) =>
            Number.isFinite(p.x) &&
            Number.isFinite(p.y) &&
            Number.isFinite(p.delta_energy)
    );

    if (!valid.length) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-slate-500">No projection data available.</p>
                </CardContent>
            </Card>
        );
    }

    const minX = Math.min(...valid.map((p) => p.x));
    const maxX = Math.max(...valid.map((p) => p.x));
    const minY = Math.min(...valid.map((p) => p.y));
    const maxY = Math.max(...valid.map((p) => p.y));
    const minE = Math.min(...valid.map((p) => p.delta_energy));
    const maxE = Math.max(...valid.map((p) => p.delta_energy));

    const scaleX = (x) => {
        const denom = maxX - minX || 1;
        return padding + ((x - minX) / denom) * (width - padding * 2);
    };

    const scaleY = (y) => {
        const denom = maxY - minY || 1;
        return height - padding - ((y - minY) / denom) * (height - padding * 2);
    };

    return (
        <Card className="group relative">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto relative min-h-[440px]">
                <div className="mb-3 flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-full bg-blue-500" />
                        Lower ΔE
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
                        Higher ΔE
                    </div>
                </div>

                <svg width={width} height={height} className="rounded-xl border border-slate-200/50 bg-white/50 backdrop-blur-sm">
                    <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#cbd5e1" />
                    <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#cbd5e1" />
                    
                    <text x={width / 2} y={height - 15} textAnchor="middle" className="text-xs fill-slate-500 font-medium tracking-wide shadow-sm">Projection Dimension 1</text>
                    <text x={18} y={height / 2} textAnchor="middle" transform={`rotate(-90, 18, ${height/2})`} className="text-xs fill-slate-500 font-medium tracking-wide shadow-sm">Projection Dimension 2</text>

                    {valid.map((p, i) => (
                        <circle
                            key={`${p.structure_id || "point"}-${i}`}
                            cx={scaleX(p.x)}
                            cy={scaleY(p.y)}
                            r="3"
                            fill={getEnergyColor(p.delta_energy, minE, maxE)}
                            opacity="0.85"
                        >
                            <title>
                                {`${p.structure_id} | ΔE: ${formatNumber(p.delta_energy)} | Cluster: ${p.cluster_label}`}
                            </title>
                        </circle>
                    ))}
                </svg>
                <div className="absolute top-16 right-8 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                   <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-xl shadow-glass border border-slate-200/60 max-w-[240px]">
                      <p className="font-semibold text-slate-800 text-xs tracking-tight">Graph Overview</p>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{summary}</p>
                   </div>
                </div>
            </CardContent>
        </Card>
    );
}

function ClusterBoxplot({ rows, topN = 10, summary="Details the spread and median of energy values for highly populated clustering motifs, establishing which structural families are statistically most stable." }) {
    const width = 860;
    const height = 380;
    const padding = 50;

    const clusterStats = Object.values(
        rows.reduce((acc, row) => {
            const label = String(row.cluster_label ?? "unknown");
            const delta = finiteNumber(row.delta_energy);

            if (delta === null) return acc;

            if (!acc[label]) {
                acc[label] = {
                    cluster_label: label,
                    values: [],
                };
            }

            acc[label].values.push(delta);
            return acc;
        }, {})
    )
        .map((group) => {
            const sorted = [...group.values].sort((a, b) => a - b);
            return {
                cluster_label: group.cluster_label,
                count: sorted.length,
                min: sorted[0],
                q1: quantile(sorted, 0.25),
                median: quantile(sorted, 0.5),
                q3: quantile(sorted, 0.75),
                max: sorted[sorted.length - 1],
                mean: mean(sorted),
            };
        })
        .sort((a, b) => a.mean - b.mean)
        .slice(0, topN);

    if (!clusterStats.length) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Cluster vs ΔE Boxplots</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-slate-500">No cluster energy data available.</p>
                </CardContent>
            </Card>
        );
    }

    const allValues = clusterStats.flatMap((c) => [c.min, c.q1, c.median, c.q3, c.max]).filter(Number.isFinite);
    const globalMin = Math.min(...allValues);
    const globalMax = Math.max(...allValues);

    const scaleY = (value) => {
        const denom = globalMax - globalMin || 1;
        return height - padding - ((value - globalMin) / denom) * (height - padding * 2);
    };

    const usableWidth = width - padding * 2;
    const step = usableWidth / clusterStats.length;

    return (
        <Card className="group relative">
            <CardHeader>
                <CardTitle>Cluster vs ΔE Boxplots</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto relative min-h-[400px]">
                <p className="mb-3 text-sm text-slate-500">
                    Showing the {clusterStats.length} lowest-mean-energy clusters.
                </p>

                <svg width={width} height={height} className="rounded-xl border border-slate-200/50 bg-white/50 backdrop-blur-sm">
                    <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#cbd5e1" />
                    <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#cbd5e1" />
                    
                    <text x={width / 2} y={height - 5} textAnchor="middle" className="text-xs fill-slate-500 font-medium tracking-wide shadow-sm">Cluster Label (Motif Families)</text>
                    <text x={18} y={height / 2} textAnchor="middle" transform={`rotate(-90, 18, ${height/2})`} className="text-xs fill-slate-500 font-medium tracking-wide shadow-sm">ΔE (Energy Difference)</text>

                    {clusterStats.map((cluster, index) => {
                        const centerX = padding + index * step + step / 2;
                        const boxWidth = Math.min(28, step * 0.45);

                        return (
                            <g key={cluster.cluster_label}>
                                <line
                                    x1={centerX}
                                    x2={centerX}
                                    y1={scaleY(cluster.min)}
                                    y2={scaleY(cluster.max)}
                                    stroke="#64748b"
                                    strokeWidth="1.5"
                                />
                                <rect
                                    x={centerX - boxWidth / 2}
                                    y={scaleY(cluster.q3)}
                                    width={boxWidth}
                                    height={Math.max(2, scaleY(cluster.q1) - scaleY(cluster.q3))}
                                    fill="rgb(59 130 246 / 0.22)"
                                    stroke="#2563eb"
                                />
                                <line
                                    x1={centerX - boxWidth / 2}
                                    x2={centerX + boxWidth / 2}
                                    y1={scaleY(cluster.median)}
                                    y2={scaleY(cluster.median)}
                                    stroke="#1e293b"
                                    strokeWidth="2"
                                />
                                <line
                                    x1={centerX - boxWidth / 3}
                                    x2={centerX + boxWidth / 3}
                                    y1={scaleY(cluster.min)}
                                    y2={scaleY(cluster.min)}
                                    stroke="#64748b"
                                />
                                <line
                                    x1={centerX - boxWidth / 3}
                                    x2={centerX + boxWidth / 3}
                                    y1={scaleY(cluster.max)}
                                    y2={scaleY(cluster.max)}
                                    stroke="#64748b"
                                />

                                <text
                                    x={centerX}
                                    y={height - padding + 18}
                                    textAnchor="middle"
                                    fontSize="11"
                                    fill="#475569"
                                >
                                    {cluster.cluster_label}
                                </text>

                                <title>
                                    {`Cluster ${cluster.cluster_label} | mean ${formatNumber(cluster.mean)} | n=${cluster.count}`}
                                </title>
                            </g>
                        );
                    })}
                </svg>
                <div className="absolute top-16 right-8 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                   <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-xl shadow-glass border border-slate-200/60 max-w-[240px]">
                      <p className="font-semibold text-slate-800 text-xs tracking-tight">Graph Overview</p>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{summary}</p>
                   </div>
                </div>
            </CardContent>
        </Card>
    );
}

function TopMotifCards({ clusters }) {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {clusters.map((cluster) => (
                <Card key={cluster.cluster_label}>
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm text-slate-500">Motif Cluster</p>
                                <p className="mt-2 text-2xl font-semibold text-slate-900">
                                    {cluster.cluster_label}
                                </p>
                            </div>
                            <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                                Top Stable
                            </div>
                        </div>

                        <div className="mt-4 space-y-1 text-sm text-slate-600">
                            <p>Mean ΔE: {formatNumber(cluster.mean_delta)}</p>
                            <p>Best ΔE: {formatNumber(cluster.min_delta)}</p>
                            <p>Members: {cluster.count}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default function EnergyAnalysis() {
    const [method, setMethod] = useState("umap");
    const [rows, setRows] = useState([]);
    const [mapRows, setMapRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        async function loadData() {
            try {
                setLoading(true);
                setError("");

                const [searchRows, embeddingRows] = await Promise.all([
                    fetchJson("/search?limit=500"),
                    fetchJson(`/embedding-map?method=${method}&limit=3000`),
                ]);

                if (!active) return;

                setRows(searchRows);
                setMapRows(embeddingRows);
            } catch (err) {
                if (!active) return;
                setRows([]);
                setMapRows([]);
                setError(err.message || "Failed to load energy dashboard");
            } finally {
                if (active) setLoading(false);
            }
        }

        loadData();

        return () => {
            active = false;
        };
    }, [method]);

    const stats = useMemo(() => {
        const deltaValues = rows.map((r) => finiteNumber(r.delta_energy)).filter((v) => v !== null);
        const energyValues = rows.map((r) => finiteNumber(r.energy)).filter((v) => v !== null);

        const meanDelta = deltaValues.length ? mean(deltaValues) : null;
        const minDelta = deltaValues.length ? Math.min(...deltaValues) : null;
        const maxDelta = deltaValues.length ? Math.max(...deltaValues) : null;
        const meanEnergy = energyValues.length ? mean(energyValues) : null;

        const clusterGroups = Object.values(
            rows.reduce((acc, row) => {
                const label = String(row.cluster_label ?? "unknown");
                const delta = finiteNumber(row.delta_energy);

                if (delta === null) return acc;

                if (!acc[label]) {
                    acc[label] = {
                        cluster_label: label,
                        values: [],
                    };
                }

                acc[label].values.push(delta);
                return acc;
            }, {})
        )
            .map((group) => ({
                cluster_label: group.cluster_label,
                count: group.values.length,
                mean_delta: mean(group.values),
                min_delta: Math.min(...group.values),
            }))
            .sort((a, b) => a.mean_delta - b.mean_delta);

        return {
            structureCount: rows.length,
            meanEnergy,
            meanDelta,
            minDelta,
            maxDelta,
            topClusters: clusterGroups.slice(0, 4),
            deltaValues,
        };
    }, [rows]);

    const coloredProjection = useMemo(() => {
        const byId = new Map(rows.map((row) => [row.structure_id, row]));

        return mapRows
            .map((point) => {
                const match = byId.get(point.structure_id);
                return {
                    ...point,
                    delta_energy: finiteNumber(match?.delta_energy),
                    cluster_label: match?.cluster_label,
                };
            })
            .filter((point) => Number.isFinite(point.delta_energy));
    }, [rows, mapRows]);

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center">
                    <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        className="input-field max-w-xs"
                    >
                        <option value="umap">UMAP</option>
                        <option value="pca">PCA</option>
                        <option value="tsne">t-SNE</option>
                    </select>

                    <p className="text-sm text-slate-500">
                        Change the projection method to inspect energy organization in latent space.
                    </p>
                </CardContent>
            </Card>

            {loading ? <p className="text-sm text-slate-500">Loading energy dashboard...</p> : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label="Structures Loaded"
                    value={stats.structureCount}
                    hint="Rows from /search"
                />
                <MetricCard
                    label="Average Energy"
                    value={formatNumber(stats.meanEnergy)}
                    hint="Mean raw energy"
                />
                <MetricCard
                    label="Average ΔE"
                    value={formatNumber(stats.meanDelta)}
                    hint="Mean stability value"
                />
                <MetricCard
                    label="ΔE Range"
                    value={`${formatNumber(stats.minDelta, 3)} to ${formatNumber(stats.maxDelta, 3)}`}
                    hint="Min to max delta energy"
                />
            </div>

            <TopMotifCards clusters={stats.topClusters} />

            <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
                <HistogramChart
                    values={stats.deltaValues}
                    title="Histogram of ΔE"
                />

                <Card>
                    <CardHeader>
                        <CardTitle>Low-Energy Motif Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-600">
                        {stats.topClusters.length === 0 ? (
                            <p>No cluster summaries available.</p>
                        ) : (
                            stats.topClusters.map((cluster) => (
                                <div key={cluster.cluster_label} className="rounded-xl border p-3">
                                    <p className="font-medium text-slate-900">
                                        Cluster {cluster.cluster_label}
                                    </p>
                                    <p className="mt-1">
                                        This motif currently looks among the most stable groups based on mean ΔE.
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Mean ΔE {formatNumber(cluster.mean_delta)} · Best ΔE {formatNumber(cluster.min_delta)} · Members {cluster.count}
                                    </p>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            <ClusterBoxplot rows={rows} topN={10} />

            <EnergyScatter
                points={coloredProjection}
                title={`${method.toUpperCase()} Colored by ΔE`}
            />
        </div>
    );
}