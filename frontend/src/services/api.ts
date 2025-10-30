import axios, { AxiosInstance } from "axios";
import { ChatRequest, ChatResponse } from "@/types/api";

class ApiService {
  private client: AxiosInstance;

  constructor() {
    const baseURL = import.meta.env.VITE_API_URL || "";
    this.client = axios.create({
      baseURL,
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

  async speechToSpeech(formData: FormData): Promise<ChatResponse> {
    const response = await this.client.post<ChatResponse>(
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
