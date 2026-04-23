export default function ViewerToolbar({ colorMode, onChangeColorMode }) {
    return (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Viewer Controls</h3>

            <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                    Color Mode
                </label>
                <select
                    value={colorMode}
                    onChange={(e) => onChangeColorMode(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                    <option value="atom">Atom Type</option>
                    <option value="layer">Lower vs Upper Layer</option>
                </select>
            </div>

            <div className="mt-4 text-xs leading-5 text-slate-500">
                Rotate, zoom, and pan directly inside the 3D viewer.
            </div>
        </div>
    );
}