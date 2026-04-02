export interface SecurityToolStrategy {
  execute(target: string): Promise<string>;
  executeStream(target: string): AsyncGenerator<string>;
  getToolName(): string;
}
