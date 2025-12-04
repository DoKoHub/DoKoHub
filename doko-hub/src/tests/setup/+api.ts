const BASE_URL = 'http://localhost:3000';

jest.setTimeout(15000);

interface ApiResponse {
    status: number;
    body: any;
}

const callApi = async (method: string, path: string, data?: any): Promise<ApiResponse> => {
    try {
        const response = await fetch(`${BASE_URL}${path}`, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: data ? JSON.stringify(data) : undefined,
        });

        let body = {};
        try {
            body = await response.json();
        } catch (e) {
        }

        return {
            status: response.status,
            body: body,
        };
    } catch (error) {
        console.error(`API Call failed for ${method} ${path}:`, error);
        return { status: 500, body: { error: 'Network or Fetch error' } };
    }
};

export const api = {
    get: (path: string) => callApi('GET', path),
    post: (path: string, data: any) => callApi('POST', path, data),
    put: (path: string, data: any) => callApi('PUT', path, data),
    delete: (path: string) => callApi('DELETE', path),
};