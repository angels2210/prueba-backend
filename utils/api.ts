const API_BASE_URL = 'http://localhost:5000/api';

const getAuthToken = (): string | null => {
    try {
        const token = window.localStorage.getItem('authToken');
        return token;
    } catch (e) {
        // Handle cases where localStorage is not available (e.g., private browsing)
        return null;
    }
};

const apiFetch = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    const token = getAuthToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        // If the response is not OK, we need to handle it as an error.
        if (!response.ok) {
            let errorMessage = `API Error: ${response.status} ${response.statusText}`;
            try {
                // Try to parse the error response as JSON, as many APIs do.
                const errorData = await response.json();
                errorMessage = errorData.message || JSON.stringify(errorData);
            } catch (jsonError) {
                // If it's not JSON, it might be HTML or plain text.
                try {
                    const textError = await response.text();
                    // We don't want to throw the entire HTML page in the error message.
                    errorMessage = `Server returned a non-JSON error page. Status: ${response.status}. Please check backend logs and CORS configuration.`;
                    console.error("Non-JSON response body:", textError); // Log the full HTML for debugging.
                } catch (textError) {
                    // Could not even read as text.
                }
            }
            throw new Error(errorMessage);
        }

        // Handle successful responses with no content (e.g., 204 No Content on DELETE)
        if (response.status === 204) {
            return null;
        }

        // For successful responses, we expect JSON.
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            // This case is unexpected for a successful (2xx) response.
            // It means the backend is misconfigured and sending, for example, HTML with a 200 OK status.
            const responseText = await response.text();
            console.error("Expected JSON but received other content type:", responseText);
            throw new Error('The server returned an unexpected response format. Expected JSON.');
        }

    } catch (error) {
        // This catches network errors (e.g., backend server is down) and re-thrown errors.
        console.error(`API Fetch Error: ${options.method || 'GET'} ${endpoint}`, error);
        // Re-throw the error to be handled by the calling context/component.
        throw error;
    }
};

export default apiFetch;
