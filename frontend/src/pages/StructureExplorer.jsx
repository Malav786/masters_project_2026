import { useEffect, useState } from "react";
import CIFViewer3D from "../components/structure/CIFViewer3D";
import ViewerToolbar from "../components/structure/ViewerToolbar";
import { fetchStructureCif } from "../lib/api";

export default function StructureExplorer({ selectedStructure }) {
    const [cifText, setCifText] = useState("");
    const [loadingCif, setLoadingCif] = useState(false);
    const [viewerError, setViewerError] = useState("");
    const [colorMode, setColorMode] = useState("atom");

    useEffect(() => {
        if (!selectedStructure?.structure_id) return;

        let cancelled = false;

        async function loadCif() {
            try {
                setLoadingCif(true);
                setViewerError("");
                setCifText("");

                const text = await fetchStructureCif(selectedStructure.structure_id);

                if (!cancelled) {
                    setCifText(text);
                }
            } catch (error) {
                if (!cancelled) {
                    setViewerError("Could not load CIF file for this structure.");
                }
            } finally {
                if (!cancelled) {
                    setLoadingCif(false);
                }
            }
        }

        loadCif();

        return () => {
            cancelled = true;
        };
    }, [selectedStructure?.structure_id]);

    return (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-1">
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <h2 className="mb-4 text-lg font-semibold text-slate-900">
                        Structure Metadata
                    </h2>

                    {selectedStructure ? (
                        <div className="space-y-2 text-sm text-slate-700">
                            <p><span className="font-medium">Structure ID:</span> {selectedStructure.structure_id}</p>
                            <p><span className="font-medium">Energy:</span> {selectedStructure.energy}</p>
                            <p><span className="font-medium">Delta Energy:</span> {selectedStructure.delta_energy}</p>
                            <p><span className="font-medium">Cluster:</span> {selectedStructure.cluster_label}</p>
                            <p><span className="font-medium">Lower Rotation:</span> {selectedStructure.lower_rotation}</p>
                            <p><span className="font-medium">Upper Rotation:</span> {selectedStructure.upper_rotation}</p>
                            <p><span className="font-medium">Displacement:</span> {selectedStructure.displacement}</p>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500">Select a structure to inspect.</p>
                    )}
                </div>

                <ViewerToolbar
                    colorMode={colorMode}
                    onChangeColorMode={setColorMode}
                />
            </div>

            <div className="xl:col-span-2">
                {!selectedStructure ? (
                    <div className="rounded-2xl border bg-white p-8 text-sm text-slate-500 shadow-sm">
                        Select a structure to view its 3D CIF visualization.
                    </div>
                ) : loadingCif ? (
                    <div className="rounded-2xl border bg-white p-8 text-sm text-slate-500 shadow-sm">
                        Loading 3D structure...
                    </div>
                ) : viewerError ? (
                    <div className="rounded-2xl border bg-white p-8 text-sm text-red-600 shadow-sm">
                        {viewerError}
                    </div>
                ) : (
                    <CIFViewer3D
                        cifText={cifText}
                        structureId={selectedStructure.structure_id}
                        colorMode={colorMode}
                        height={580}
                    />
                )}
            </div>
        </div>
    );
}