import { useState, useEffect } from 'react';
import { Cartesian3, Color } from 'cesium';
import { Viewer, Entity, PolylineGraphics, CameraFlyTo } from 'resium';

function CesiumComponent() {
  const [trackPositions, setTrackPositions] = useState<Cartesian3[]>([]);
  const [movingEntityPosition, setMovingEntityPosition] = useState<Cartesian3 | null>(null);
  
  // Initial camera position (does not move)
  const initialPosition = Cartesian3.fromDegrees(-86.234842, 39.794542, 3000);

  useEffect(() => {
    async function fetchTrackData() {
      try {
        const response = await fetch('/track_coords.csv');
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const text = await response.text();
        console.log("Raw CSV Data:\n", text);

        const lines = text.trim().split('\n').slice(1); 
        const positions: Cartesian3[] = lines
          .map((line, index) => {
            const parts = line.split(',').map(value => value.trim());
            if (parts.length < 3) {
              console.error(`Invalid line at index ${index}:`, line);
              return null;
            }

            const lat = parseFloat(parts[1]);
            const lon = parseFloat(parts[2]);

            if (isNaN(lat) || isNaN(lon)) {
              console.error(`Invalid coordinate at index ${index}:`, lat, lon);
              return null;
            }

            return Cartesian3.fromDegrees(lon, lat, 0);
          })
          .filter((pos): pos is Cartesian3 => pos !== null);

        console.log("Parsed Track Positions:", positions);

        if (positions.length === 0) {
          console.warn("No valid positions found in CSV file.");
          return;
        }

        setTrackPositions(positions);
        moveEntity(positions, 1000); //start constant speed
      } catch (error) {
        console.error('Error loading track data:', error);
      }
    }

    fetchTrackData();
  }, []);

  /**
   * Moves the entity along the track positions based on calculated time per distance.
   * @param {Cartesian3[]} coords - Array of track positions.
   * @param {number | number[]} speed - Speed in m/s (either constant or list).
   */
  function moveEntity(coords: Cartesian3[], speed: number | number[]) {
    if (coords.length < 2) return;

    let index = 0;
    setMovingEntityPosition(coords[0]); // Start at first position

    function moveNext() {
      if (index >= coords.length - 1) return; // Stop when reaching the last point

      const distance = Cartesian3.distance(coords[index], coords[index + 1]); // Get distance between points
      const currentSpeed = Array.isArray(speed) ? speed[index] : speed; // Use speed array or constant

      const travelTime = (distance / currentSpeed) * 1000; // Convert seconds to milliseconds

      console.log(`Moving from ${index} to ${index + 1}, Distance: ${distance.toFixed(2)}m, Speed: ${currentSpeed}m/s, Time: ${travelTime.toFixed(2)}ms`);

      setTimeout(() => {
        index++;
        setMovingEntityPosition(coords[index]);
        moveNext(); // Move to the next position
      }, travelTime);
    }

    moveNext(); // Start movement loop
  }

  return (
    <Viewer full>
      <CameraFlyTo 
        destination={initialPosition}
        duration={0} // Instantly set camera position (no tracking)
      />

      {trackPositions.length > 0 && (
        <>
          <Entity
            name="Indianapolis Motor Speedway"
            position={trackPositions[0]}
            point={{ pixelSize: 10, color: Color.WHITE }}
            description="Start Point"
          />
          <Entity>
            <PolylineGraphics 
              positions={trackPositions}
              width={5}
              material={Color.YELLOW}
            />
          </Entity>

          {/* Moving Entity (Moves based on distance/speed calculations) */}
          {movingEntityPosition && (
            <Entity
              name="Moving Entity"
              position={movingEntityPosition}
              point={{ pixelSize: 20, color: Color.RED }} // Bigger point for visibility
              description="Following the track altitude"
            />
          )}
        </>
      )}
    </Viewer>
  );
}

export default CesiumComponent;
