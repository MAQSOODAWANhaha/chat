import axios from "axios";
class ApiService {
    constructor() {
        Object.defineProperty(this, "client", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        const baseURL = import.meta.env.VITE_API_URL || "";
        this.client = axios.create({
            baseURL,
            timeout: 30000,
            headers: {
                "Content-Type": "application/json",
            },
        });
    }
    async chat(request) {
        const response = await this.client.post("/api/chat", request);
        return response.data;
    }
    async speechToText(formData) {
        const response = await this.client.post("/api/speech-to-text", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    }
}
export const api = new ApiService();
