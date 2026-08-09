export class SdlcError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = "SdlcError";
    this.exitCode = exitCode;
  }
}

