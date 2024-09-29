import React, { useEffect, useState } from "react";
import { Chart } from "react-google-charts";
import ApiService from './ApiService'; // Importe o objeto ApiService
import "./SidebarMenu.css";
import "./SessionInfoSidebar.css";
import aircraftDataJson from "./GetAircraft.json"; // Importe o JSON local

const SessionInfoSidebar = ({ sessionName, sessionId }) => {
  const [userCount, setUserCount] = useState(null);
  const [aircraftData, setAircraftData] = useState([]);
  const [airports, setAirports] = useState([]);
  const [atcData, setAtcData] = useState([]);

  // Fetch session data (user count)
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const sessionData = await ApiService.getSessionData(sessionId); // Use ApiService
        setUserCount(sessionData.userCount);
      } catch (error) {
        console.error("Error fetching session data:", error);
      }
    };

    fetchSessionData();
  }, [sessionId]);

  // Fetch flight data (popular aircraft)
  useEffect(() => {
    const fetchFlightData = async () => {
      try {
        const flightData = await ApiService.getFlightData(sessionId); // Use ApiService

        const aircraftCount = flightData.reduce((acc, flight) => {
          const { aircraftId } = flight;
          acc[aircraftId] = (acc[aircraftId] || 0) + 1;
          return acc;
        }, {});

        const aircraftArray = Object.entries(aircraftCount)
          .map(([id, count]) => {
            const aircraft = aircraftDataJson.result.find((ac) => ac.id === id);
            return [aircraft ? aircraft.name : "Unknown", count];
          })
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        const chartData = [["Aircraft", "Count"], ...aircraftArray];
        setAircraftData(chartData);
      } catch (error) {
        console.error("Error fetching flight data:", error);
      }
    };

    fetchFlightData();
  }, [sessionId]);

  // Fetch airport data (most popular airports)
  useEffect(() => {
    const fetchAirportsData = async () => {
      try {
        const airportData = await ApiService.getAirportData(sessionId); // Use ApiService
        
        const sortedAirports = airportData.sort((a, b) => b.inboundFlightsCount - a.inboundFlightsCount).slice(0, 5);
        setAirports(sortedAirports);
      } catch (error) {
        console.error("Error fetching airport data:", error);
      }
    };

    fetchAirportsData();
  }, [sessionId]);

  // Fetch ATC data
  useEffect(() => {
    const fetchAtcData = async () => {
      try {
        const atcData = await ApiService.getAtcData(sessionId); // Use ApiService
        setAtcData(atcData);
      } catch (error) {
        console.error("Error fetching ATC data:", error);
      }
    };

    fetchAtcData();
  }, [sessionId]);

  const getTypeLabel = (type) => {
    const typeLabels = ["grd", "twr", "unicom", "clr", "app", "dep", "ctr", "atis"];
    return typeLabels[type] || "";
  };

  const atcGroupedByAirport = atcData.reduce((acc, atc) => {
    const { airportName, type } = atc;
    const typeLabel = getTypeLabel(type);
    if (!acc[airportName]) {
      acc[airportName] = { grd: false, twr: false, app: false, dep: false, ctr: false, atis: false };
    }
    if (typeLabel) {
      acc[airportName][typeLabel] = true;
    }
    return acc;
  }, {});

  return (
    <div className="session-info-sidebar">
      <div className="statistics-header">
        <h3>Infinite Monitor Live</h3>
        <p>1.1.0v Alpha</p>
      </div>
      <div className="name-session">
        <h4>{sessionName}</h4>
      </div>
      <div className="session-count-user">
        {userCount !== null ? (
          <p>
            <span>{userCount}</span> Users Online
          </p>
        ) : (
          <p>Loading...</p>
        )}
      </div>

      <div className="chart-section">
        <div className="grafic-header">
          <h4>5 Popular Aircraft</h4>
        </div>
        <div className="chart-container">
          {aircraftData.length > 1 ? (
            <Chart
              chartType="PieChart"
              data={aircraftData}
              options={{
                pieHole: 0.4,
                is3D: false,
                backgroundColor: "transparent",
                legend: {
                  position: "none", // Remove a legenda
                },
                pieSliceText: "label", // Mostra apenas o nome na fatia
                slices: {
                  0: { color: "#1f15af" },
                  1: { color: "#3f32f3" },
                  2: { color: "#5b5dec" },
                  3: { color: "#6d6cb6" },
                  4: { color: "#9a99cc" },
                },
                chartArea: {
                  width: "100%",
                  height: "100%",
                },
              }}
              width="200px" // Ajusta a largura do gráfico
              height="200px" // Ajusta a altura do gráfico
            />
          ) : (
            <p>Loading chart...</p>
          )}
        </div>
      </div>

      <div className="statistics-section">
        <h4>Most Popular Airports</h4>
        <div className="airport-table">
          <div className="airport-table-header">
            <span className="labelInbound">Inbound</span>
            <span className="labelOutbound">Outbound</span>
          </div>
          {airports.map(airport => (
            <div key={airport.airportIcao} className="airport-stat">
              <span className="inbound">{airport.inboundFlightsCount}</span>
              <span className="airport">{airport.airportIcao}</span>
              <span className="outbound">{airport.outboundFlightsCount}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="statistics-section-atc">
        <h4>ATC Status</h4>
        <ul>
          {Object.keys(atcGroupedByAirport).map(airport => (
            <li key={airport} className="airport-stat">
              <span className="airport">{airport}</span>
              <span className="atc-status">
                {atcGroupedByAirport[airport].grd && <span>Grd</span>}
                {atcGroupedByAirport[airport].twr && <span>Twr</span>}
                {atcGroupedByAirport[airport].app && <span>App</span>}
                {atcGroupedByAirport[airport].dep && <span>Dep</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SessionInfoSidebar;
