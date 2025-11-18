export interface CommandDefinition {
  syntax: string;
  description: string;
  example: string;
}

export interface CosirobCommands {
  sp: CommandDefinition;
  ac: CommandDefinition;
  mo: CommandDefinition;
  mv: CommandDefinition;
  ip: CommandDefinition;
  mj: CommandDefinition;
  pd: CommandDefinition;
  or: CommandDefinition;
  ho: CommandDefinition;
  st: CommandDefinition;
  pa: CommandDefinition;
  co: CommandDefinition;
  rs: CommandDefinition;
  wp: CommandDefinition;
  rd: CommandDefinition;
  wh: CommandDefinition;
  gp: CommandDefinition;
  go: CommandDefinition;
  gc: CommandDefinition;
  io: CommandDefinition;
  ir: CommandDefinition;
  dw: CommandDefinition;
  ts: CommandDefinition;
  te: CommandDefinition;
  cl: CommandDefinition;
  ve: CommandDefinition;
  st_query: CommandDefinition;
  en: CommandDefinition;
  di: CommandDefinition;
}

export interface CommandsData {
  CosirobCommands: CosirobCommands;
}