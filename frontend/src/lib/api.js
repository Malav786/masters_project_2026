const API_BASE_URL = "http://127.0.0.1:8000";

async function fetchJson(path) {
    const response = await fetch(`${API_BASE_URL}${path}`);

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
}

export async function fetchStructureCif(structureId) {
    const response = await fetch(`${API_BASE_URL}/structure/${structureId}/cif`);

    if (!response.ok) {
        throw new Error(`Failed to fetch CIF for ${structureId}`);
    }

    return response.text();
}

export async function fetchClusterRows(clusterLabel, limit = 100) {
    return fetchJson(`/cluster/${encodeURIComponent(clusterLabel)}?limit=${limit}`);
}