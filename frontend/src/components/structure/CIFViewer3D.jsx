import { useEffect, useRef, useState } from "react";
import * as $3Dmol from "3dmol";

const ATOM_COLORS = {
    H: "#e5e7eb",
    C: "#4b5563",
    O: "#ef4444",
};

export default function CIFViewer3D({
    cifText,
    structureId,
    colorMode = "atom", // atom | layer
    height = 540,
}) {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!containerRef.current || !cifText) return;

        try {
            setError("");

            if (!viewerRef.current) {
                viewerRef.current = $3Dmol.createViewer(containerRef.current, {
                    backgroundColor: "white",
                });
            }

            const viewer = viewerRef.current;
            viewer.clear();
            viewer.addModel(cifText, "cif");

            const model = viewer.getModel();
            if (!model) {
                setError("Unable to load structure model.");
                return;
            }

            if (colorMode === "layer") {
                applyLayerStyle(viewer, model);
            } else {
                applyAtomStyle(viewer);
            }

            viewer.zoomTo();
            viewer.render();
        } catch (err) {
            console.error(err);
            setError("Failed to render CIF structure.");
        }
    }, [cifText, colorMode]);

    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver(() => {
            if (viewerRef.current) {
                viewerRef.current.resize();
                viewerRef.current.render();
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, []);

    const resetView = () => {
        if (!viewerRef.current) return;
        viewerRef.current.zoomTo();
        viewerRef.current.render();
    };

    return (
        <div className="glass-card p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200/50 px-5 py-4">
                <div>
                    <h3 className="text-base font-semibold text-slate-900">3D CIF Viewer</h3>
                    <p className="text-sm text-slate-500">
                        {structureId ? `Structure: ${structureId}` : "No structure selected"}
                    </p>
                </div>

                <button
                    onClick={resetView}
                    className="btn-secondary py-1.5 px-3 text-xs"
                >
                    Reset View
                </button>
            </div>

            <div className="border-b px-4 py-2 text-sm text-slate-600">
                {colorMode === "atom" ? (
                    <div className="flex flex-wrap gap-4">
                        <LegendDot color={ATOM_COLORS.H} label="Hydrogen" />
                        <LegendDot color={ATOM_COLORS.C} label="Carbon" />
                        <LegendDot color={ATOM_COLORS.O} label="Oxygen" />
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-4">
                        <LegendDot color="#2563eb" label="Lower layer" />
                        <LegendDot color="#f97316" label="Upper layer" />
                    </div>
                )}
            </div>

            {error ? (
                <div className="p-6 text-sm text-red-600">{error}</div>
            ) : (
                <div className="bg-white/50 backdrop-blur-sm">
                    <div
                        ref={containerRef}
                        className="w-full"
                        style={{ height: `${height}px` }}
                    />
                </div>
            )}
        </div>
    );
}

function LegendDot({ color, label }) {
    return (
        <div className="flex items-center gap-2">
            <span
                className="inline-block h-3 w-3 rounded-full border"
                style={{ backgroundColor: color }}
            />
            <span>{label}</span>
        </div>
    );
}

function applyAtomStyle(viewer) {
    viewer.setStyle(
        {},
        {
            stick: { radius: 0.16 },
            sphere: { scale: 0.28 },
        }
    );

    viewer.setStyle(
        { elem: "H" },
        {
            stick: { color: ATOM_COLORS.H, radius: 0.1 },
            sphere: { color: ATOM_COLORS.H, scale: 0.18 },
        }
    );

    viewer.setStyle(
        { elem: "C" },
        {
            stick: { color: ATOM_COLORS.C, radius: 0.16 },
            sphere: { color: ATOM_COLORS.C, scale: 0.28 },
        }
    );

    viewer.setStyle(
        { elem: "O" },
        {
            stick: { color: ATOM_COLORS.O, radius: 0.16 },
            sphere: { color: ATOM_COLORS.O, scale: 0.32 },
        }
    );
}

function applyLayerStyle(viewer, model) {
    const atoms = model.selectedAtoms({}) || [];

    if (!atoms.length) {
        applyAtomStyle(viewer);
        return;
    }

    const sortedZ = [...atoms].map((a) => a.z).sort((a, b) => a - b);
    const medianZ = sortedZ[Math.floor(sortedZ.length / 2)];

    for (const atom of atoms) {
        const isLower = atom.z <= medianZ;
        const color = isLower ? "#2563eb" : "#f97316";

        viewer.setStyle(
            { serial: atom.serial },
            {
                stick: { color, radius: 0.16 },
                sphere: { color, scale: 0.30 },
            }
        );
    }
}