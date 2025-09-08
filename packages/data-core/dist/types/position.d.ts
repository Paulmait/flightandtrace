export interface Position {
    timestamp: Date;
    latitude: number;
    longitude: number;
    altitude: number | null;
    heading: number | null;
    speed: number | null;
    verticalRate: number | null;
    onGround: boolean;
    source: PositionSource;
    accuracy: PositionAccuracy;
}
export declare enum PositionSource {
    ADS_B = "ads-b",
    MLAT = "mlat",
    RADAR = "radar",
    ESTIMATED = "estimated",
    MANUAL = "manual"
}
export declare enum PositionAccuracy {
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low",
    ESTIMATED = "estimated"
}
export interface Trail {
    flightId: string;
    positions: Position[];
    segments: TrailSegment[];
}
export interface TrailSegment {
    startIndex: number;
    endIndex: number;
    type: SegmentType;
    confidence: number;
}
export declare enum SegmentType {
    OBSERVED = "observed",
    INTERPOLATED = "interpolated",
    ESTIMATED = "estimated",
    OUT_OF_COVERAGE = "out_of_coverage"
}
