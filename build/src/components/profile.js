import React, {useMemo} from "react";
import {format} from "d3-format";
import {RadarChart} from "react-vis";
const wideFormat = format(".3r");
export default function BasicRadarChart({id}) {
  const DATA = useMemo(() => [{
    name: "Mercedes",
    revenue: Math.random() * 10,
    independance: Math.random() * 10,
    knowledge: Math.random() * 10,
    performance: Math.random() * 10,
    arrivalTime: Math.random() * 10,
    employment: Math.random() * 10
  }], [id]);
  return React.createElement(RadarChart, {
    className: "chart",
    data: DATA,
    tickFormat: (t) => wideFormat(t),
    startingAngle: 0,
    showLabels: false,
    domains: [{
      name: "revenue",
      tickFormat: (t) => `.`,
      domain: [0, 10]
    }, {
      name: "independance",
      domain: [0, 10],
      tickFormat: (t) => `.`,
      getValue: (d) => d.independance
    }, {
      name: "knowledge",
      tickFormat: (t) => `.`,
      domain: [0, 10],
      getValue: (d) => d.knowledge
    }, {
      name: "performance",
      domain: [0, 10],
      tickFormat: (t) => `.`,
      getValue: (d) => d.performance
    }, {
      name: "arrivalTime",
      tickFormat: (t) => `.`,
      domain: [0, 10],
      getValue: (d) => d.arrivalTime
    }, {
      name: "employment",
      tickFormat: (t) => `.`,
      domain: [0, 10],
      getValue: (d) => d.employment
    }],
    width: 250,
    height: 250
  });
}
