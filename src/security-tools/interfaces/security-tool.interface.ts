export interface SecurityToolStrategy {
  execute(target: string): Promise<string>;
  getToolName(): string;
}
