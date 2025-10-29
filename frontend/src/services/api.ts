import axios, { AxiosInstance } from "axios";
import { ChatRequest, ChatResponse, STTResponse } from "@/types/api";

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await this.client.post<ChatResponse>("/api/chat", request);
    return response.data;
  }

  async speechToText(formData: FormData): Promise<STTResponse> {
    const response = await this.client.post<STTResponse>(
      "/api/speech-to-text",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  }
}

export const api = new ApiService();
