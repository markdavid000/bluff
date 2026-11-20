export class TableMissing extends Error {
  constructor(id: bigint) {
    super(`Table ${id} does not exist`);
  }
}

export class MoveRefused extends Error {
  constructor(
    readonly errorName: string,
    cause: unknown
  ) {
    super(`The game refused the move: ${errorName}`, { cause });
  }
}
