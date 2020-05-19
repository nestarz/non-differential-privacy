import React from "react";
import {ComposableMap, Geographies, Geography, Annotation} from "react-simple-maps";
import topoJson from "./../../../../src/assets/eindhoven.json";
const MapChart = ({strokeWidth = 0.25, name = "Eindhoven", lat = 2.3522, lng = 48.8566}) => {
  return React.createElement(ComposableMap, {
    viewBox: "0 0 800 800",
    preserveAspectRatio: "xMinYMin meet",
    style: {
      height: "100%",
      background: "white"
    },
    projection: "geoAzimuthalEqualArea",
    projectionConfig: {
      rotate: [-5.45, -51.44, 0],
      scale: 602000
    }
  }, React.createElement(Geographies, {
    geography: topoJson,
    fill: "red",
    stroke: "white",
    strokeWidth
  }, ({geographies}) => geographies.map((geo) => React.createElement(Geography, {
    key: geo.rsmKey,
    geography: geo
  }))), React.createElement(Annotation, {
    subject: [lng, lat],
    dx: -90,
    dy: -30,
    connectorProps: {
      stroke: "white",
      strokeWidth: 5,
      strokeLinecap: "round"
    }
  }, React.createElement("text", {
    x: "-8",
    textAnchor: "end",
    alignmentBaseline: "middle",
    fill: "white"
  }, name)));
};
export default MapChart;
