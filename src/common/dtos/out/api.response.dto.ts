export class ApiResponse<T> {
  code: number;
  message: string;
  content: T | null;
  timestamp: string;

  constructor(code: number, message: string, content: T | null = null) {
    this.code = code;
    this.message = message;
    this.content = content ?? null;
    this.timestamp = new Date().toISOString();
  }
}