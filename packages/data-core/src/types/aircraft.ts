export interface Aircraft {
  icao24: string;
  registration: string | null;
  manufacturer: string | null;
  model: string | null;
  type: AircraftType | null;
  serialNumber: string | null;
  lineNumber: string | null;
  icaoAircraftType: string | null;
  operator: string | null;
  operatorCallsign: string | null;
  operatorIcao: string | null;
  operatorIata: string | null;
  owner: string | null;
  categoryDescription: string | null;
  engines: string | null;
  built: Date | null;
  lastUpdate: Date;
}

export enum AircraftType {
  LANDPLANE = 'landplane',
  SEAPLANE = 'seaplane',
  AMPHIBIAN = 'amphibian',
  HELICOPTER = 'helicopter',
  GYROCOPTER = 'gyrocopter',
  TILTWING = 'tiltwing',
  TILTROTOR = 'tiltrotor',
  GROUND_VEHICLE = 'ground_vehicle',
  TOWER = 'tower',
  DRONE = 'drone',
  BALLOON = 'balloon',
  PARAGLIDER = 'paraglider',
  UNKNOWN = 'unknown'
}