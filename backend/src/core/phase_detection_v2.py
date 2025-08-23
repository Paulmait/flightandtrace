"""
Enhanced Phase Detection Algorithm with Noise Handling
Robust against noisy VS/ALT data with smoothing and micro-leveling support
"""

from typing import List, Tuple, Optional, Dict, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import numpy as np
from collections import deque

class FlightPhase(Enum):
    """Flight phases for fuel calculation"""
    TAXI_OUT = "taxi_out"
    CLIMB = "climb"
    CRUISE = "cruise"
    DESCENT = "descent"
    TAXI_IN = "taxi_in"

@dataclass
class PhaseSlice:
    """Represents a contiguous flight phase"""
    phase: FlightPhase
    start_time: datetime
    end_time: datetime
    duration_seconds: float
    avg_altitude_ft: float
    avg_vs_fpm: float
    samples: int

class RobustPhaseDetector:
    """
    Enhanced phase detection with noise resistance
    O(n) complexity with rolling median smoothing
    """
    
    # Thresholds for phase detection
    CLIMB_VS_THRESHOLD = 300      # fpm - minimum sustained climb rate
    DESCENT_VS_THRESHOLD = -300   # fpm - maximum sustained descent rate
    CRUISE_ALT_MIN = 18000        # ft - minimum cruise altitude
    TAXI_ALT_MAX = 500           # ft - maximum taxi altitude
    
    # Noise handling parameters
    SMOOTHING_WINDOW = 60         # seconds for rolling median
    MICRO_LEVEL_TOLERANCE = 250   # ft - allowed deviation in cruise
    MIN_PHASE_DURATION = 120      # seconds - minimum phase duration
    MERGE_THRESHOLD = 120         # seconds - merge phases shorter than this
    
    def __init__(self, smoothing_window: int = 60):
        self.smoothing_window = smoothing_window
        self._median_buffer = deque(maxlen=smoothing_window)
    
    def detect_phases(self, 
                     samples: List[Tuple[datetime, float]],
                     smooth: bool = True) -> List[PhaseSlice]:
        """
        Detect flight phases from altitude time series
        
        Args:
            samples: List of (timestamp, altitude_ft) tuples
            smooth: Apply rolling median smoothing
            
        Returns:
            List of PhaseSlice objects, sorted and contiguous
        """
        if not samples or len(samples) < 2:
            return []
        
        # Sort samples by time (ensure monotonic)
        samples = sorted(samples, key=lambda x: x[0])
        
        # Step 1: Calculate vertical speeds and apply smoothing
        processed_data = self._preprocess_samples(samples, smooth)
        
        # Step 2: Initial phase classification
        raw_phases = self._classify_phases(processed_data)
        
        # Step 3: Merge micro-slices
        merged_phases = self._merge_micro_slices(raw_phases)
        
        # Step 4: Handle partial data
        final_phases = self._handle_partial_data(merged_phases)
        
        # Step 5: Ensure contiguous, no gaps/overlaps
        return self._ensure_contiguous(final_phases)
    
    def _preprocess_samples(self, 
                           samples: List[Tuple[datetime, float]], 
                           smooth: bool) -> List[Dict[str, Any]]:
        """
        Calculate vertical speeds and apply smoothing
        O(n) complexity with rolling median
        """
        processed = []
        
        # Use numpy for efficient calculations
        times = np.array([s[0].timestamp() for s in samples])
        alts = np.array([s[1] for s in samples])
        
        # Apply rolling median if requested
        if smooth and len(samples) > self.smoothing_window:
            # Efficient rolling median using numpy
            smoothed_alts = self._rolling_median(alts, self.smoothing_window)
        else:
            smoothed_alts = alts
        
        # Calculate vertical speeds
        for i in range(len(samples)):
            if i == 0:
                vs_fpm = 0
            else:
                dt_minutes = (times[i] - times[i-1]) / 60.0
                if dt_minutes > 0:
                    vs_fpm = (smoothed_alts[i] - smoothed_alts[i-1]) / dt_minutes
                else:
                    vs_fpm = 0
            
            processed.append({
                'time': samples[i][0],
                'alt_raw': alts[i],
                'alt_smooth': smoothed_alts[i],
                'vs_fpm': vs_fpm,
                'index': i
            })
        
        return processed
    
    def _rolling_median(self, data: np.ndarray, window: int) -> np.ndarray:
        """
        Efficient rolling median using numpy
        Pads edges to maintain array length
        """
        result = np.zeros_like(data)
        half_window = window // 2
        
        for i in range(len(data)):
            start = max(0, i - half_window)
            end = min(len(data), i + half_window + 1)
            result[i] = np.median(data[start:end])
        
        return result
    
    def _classify_phases(self, data: List[Dict[str, Any]]) -> List[PhaseSlice]:
        """
        Initial phase classification based on VS and altitude
        """
        if not data:
            return []
        
        phases = []
        current_phase = None
        phase_start = 0
        phase_alts = []
        phase_vs = []
        
        for i, point in enumerate(data):
            alt = point['alt_smooth']
            vs = point['vs_fpm']
            
            # Determine phase based on altitude and VS
            if alt < self.TAXI_ALT_MAX:
                # Ground operations
                if current_phase in [None, FlightPhase.DESCENT]:
                    new_phase = FlightPhase.TAXI_IN
                else:
                    new_phase = FlightPhase.TAXI_OUT
            elif vs > self.CLIMB_VS_THRESHOLD:
                new_phase = FlightPhase.CLIMB
            elif vs < self.DESCENT_VS_THRESHOLD:
                new_phase = FlightPhase.DESCENT
            elif alt >= self.CRUISE_ALT_MIN:
                # Check for micro-leveling in cruise
                if current_phase == FlightPhase.CRUISE:
                    # Allow small altitude deviations
                    if abs(alt - np.mean(phase_alts[-10:])) < self.MICRO_LEVEL_TOLERANCE:
                        new_phase = FlightPhase.CRUISE
                    else:
                        new_phase = FlightPhase.CLIMB if vs > 0 else FlightPhase.DESCENT
                else:
                    new_phase = FlightPhase.CRUISE
            else:
                # Transitional altitude
                if current_phase:
                    new_phase = current_phase  # Maintain previous phase
                else:
                    new_phase = FlightPhase.CLIMB if vs > 0 else FlightPhase.CRUISE
            
            # Phase change detected
            if new_phase != current_phase and current_phase is not None:
                # Save previous phase
                duration = (data[i-1]['time'] - data[phase_start]['time']).total_seconds()
                if duration > 0:
                    phases.append(PhaseSlice(
                        phase=current_phase,
                        start_time=data[phase_start]['time'],
                        end_time=data[i-1]['time'],
                        duration_seconds=duration,
                        avg_altitude_ft=np.mean(phase_alts),
                        avg_vs_fpm=np.mean(phase_vs),
                        samples=len(phase_alts)
                    ))
                
                # Reset for new phase
                phase_start = i
                phase_alts = []
                phase_vs = []
            
            current_phase = new_phase
            phase_alts.append(alt)
            phase_vs.append(vs)
        
        # Add final phase
        if current_phase and phase_alts:
            duration = (data[-1]['time'] - data[phase_start]['time']).total_seconds()
            if duration > 0:
                phases.append(PhaseSlice(
                    phase=current_phase,
                    start_time=data[phase_start]['time'],
                    end_time=data[-1]['time'],
                    duration_seconds=duration,
                    avg_altitude_ft=np.mean(phase_alts),
                    avg_vs_fpm=np.mean(phase_vs),
                    samples=len(phase_alts)
                ))
        
        return phases
    
    def _merge_micro_slices(self, phases: List[PhaseSlice]) -> List[PhaseSlice]:
        """
        Merge micro-slices (< MERGE_THRESHOLD) into neighbors
        Prevents noise-driven thrashing
        """
        if len(phases) <= 1:
            return phases
        
        merged = []
        i = 0
        
        while i < len(phases):
            current = phases[i]
            
            # Check if this is a micro-slice
            if current.duration_seconds < self.MERGE_THRESHOLD and i > 0 and i < len(phases) - 1:
                # Merge with the more similar neighbor
                prev_phase = merged[-1] if merged else None
                next_phase = phases[i + 1]
                
                if prev_phase and prev_phase.phase == next_phase.phase:
                    # Merge all three into one
                    merged[-1] = PhaseSlice(
                        phase=prev_phase.phase,
                        start_time=prev_phase.start_time,
                        end_time=next_phase.end_time,
                        duration_seconds=(next_phase.end_time - prev_phase.start_time).total_seconds(),
                        avg_altitude_ft=(prev_phase.avg_altitude_ft * prev_phase.samples + 
                                       current.avg_altitude_ft * current.samples +
                                       next_phase.avg_altitude_ft * next_phase.samples) / 
                                      (prev_phase.samples + current.samples + next_phase.samples),
                        avg_vs_fpm=(prev_phase.avg_vs_fpm * prev_phase.samples + 
                                  current.avg_vs_fpm * current.samples +
                                  next_phase.avg_vs_fpm * next_phase.samples) / 
                                 (prev_phase.samples + current.samples + next_phase.samples),
                        samples=prev_phase.samples + current.samples + next_phase.samples
                    )
                    i += 2  # Skip next phase as it's merged
                else:
                    # Merge with previous if it exists
                    if prev_phase:
                        merged[-1] = self._combine_phases(prev_phase, current)
                    else:
                        merged.append(current)
                    i += 1
            else:
                merged.append(current)
                i += 1
        
        return merged
    
    def _combine_phases(self, phase1: PhaseSlice, phase2: PhaseSlice) -> PhaseSlice:
        """Combine two phases into one"""
        total_samples = phase1.samples + phase2.samples
        return PhaseSlice(
            phase=phase1.phase,  # Keep first phase type
            start_time=phase1.start_time,
            end_time=phase2.end_time,
            duration_seconds=(phase2.end_time - phase1.start_time).total_seconds(),
            avg_altitude_ft=(phase1.avg_altitude_ft * phase1.samples + 
                           phase2.avg_altitude_ft * phase2.samples) / total_samples,
            avg_vs_fpm=(phase1.avg_vs_fpm * phase1.samples + 
                      phase2.avg_vs_fpm * phase2.samples) / total_samples,
            samples=total_samples
        )
    
    def _handle_partial_data(self, phases: List[PhaseSlice]) -> List[PhaseSlice]:
        """
        Handle partial data scenarios
        - If no taxi_out, start from climb
        - If no taxi_in, end at last phase
        """
        if not phases:
            return phases
        
        result = []
        
        # Check if we have ground phases
        has_taxi_out = any(p.phase == FlightPhase.TAXI_OUT for p in phases)
        has_taxi_in = any(p.phase == FlightPhase.TAXI_IN for p in phases)
        
        for phase in phases:
            # Skip invalid taxi phases if we don't have complete ground data
            if not has_taxi_out and phase.phase == FlightPhase.TAXI_OUT:
                continue
            if not has_taxi_in and phase.phase == FlightPhase.TAXI_IN:
                continue
            
            result.append(phase)
        
        return result
    
    def _ensure_contiguous(self, phases: List[PhaseSlice]) -> List[PhaseSlice]:
        """
        Ensure phases are sorted, contiguous with no gaps or overlaps
        """
        if len(phases) <= 1:
            return phases
        
        # Sort by start time
        phases.sort(key=lambda p: p.start_time)
        
        result = []
        for i, phase in enumerate(phases):
            if i == 0:
                result.append(phase)
            else:
                prev = result[-1]
                
                # Check for gap
                if phase.start_time > prev.end_time:
                    # Fill gap with cruise or previous phase type
                    gap_phase = FlightPhase.CRUISE if prev.avg_altitude_ft > self.CRUISE_ALT_MIN else prev.phase
                    result.append(PhaseSlice(
                        phase=gap_phase,
                        start_time=prev.end_time,
                        end_time=phase.start_time,
                        duration_seconds=(phase.start_time - prev.end_time).total_seconds(),
                        avg_altitude_ft=(prev.avg_altitude_ft + phase.avg_altitude_ft) / 2,
                        avg_vs_fpm=0,
                        samples=1
                    ))
                
                # Check for overlap
                elif phase.start_time < prev.end_time:
                    # Adjust start time to eliminate overlap
                    phase = PhaseSlice(
                        phase=phase.phase,
                        start_time=prev.end_time,
                        end_time=phase.end_time,
                        duration_seconds=(phase.end_time - prev.end_time).total_seconds(),
                        avg_altitude_ft=phase.avg_altitude_ft,
                        avg_vs_fpm=phase.avg_vs_fpm,
                        samples=phase.samples
                    )
                
                if phase.duration_seconds > 0:
                    result.append(phase)
        
        return result