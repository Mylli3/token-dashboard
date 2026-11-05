// charts.js — themed ECharts wrappers. Colors come from CSS tokens in style.css.

const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const T = () => ({
  ink:   css('--text') || '#000',
  muted: css('--muted') || '#555',
  grid:  css('--chart-grid') || '#ddd',
  panel: css('--panel') || '#fff',
  edge:  css('--border-2') || '#000',
});

// Named series colors so every chart uses the same color for the same thing.
export const SERIES = {
  get input()       { return css('--chart-1'); },
  get output()      { return css('--chart-2'); },
  get cacheCreate() { return css('--chart-4'); },
  get cacheRead()   { return css('--chart-3'); },
  get primary()     { return css('--chart-1'); },
  get secondary()   { return css('--chart-3'); },
};
const palette = () => ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5', '--chart-6'].map(css);
// Thin black outline keeps the pale Linen fills readable on cream.
const outline = () => ({ borderColor: T().edge, borderWidth: 1 });

const base = () => ({
  textStyle: { color: T().ink, fontFamily: css('--sans') },
  color: palette(),
  grid: { left: 36, right: 12, top: 24, bottom: 24, containLabel: true },
});
const xAxis = () => ({
  axisLine:  { lineStyle: { color: T().edge } },
  axisLabel: { color: T().muted },
  axisTick:  { show: false },
});
const yAxis = () => ({
  axisLine:  { show: false },
  axisTick:  { show: false },
  splitLine: { lineStyle: { color: T().grid } },
  axisLabel: { color: T().muted },
});
const tooltip = () => ({
  trigger: 'axis',
  backgroundColor: T().panel,
  borderColor: T().edge,
  borderWidth: 1,
  textStyle: { color: T().ink, fontFamily: css('--sans'), fontSize: 12 },
  padding: [8, 12],
});
const legend = extra => ({ textStyle: { color: T().muted }, icon: 'roundRect', itemWidth: 8, itemHeight: 8, ...extra });

function mount(el) {
  const c = echarts.init(el, null, { renderer: 'svg' });
  window.addEventListener('resize', () => c.resize());
  return c;
}

export function lineChart(el, { x, series }) {
  const c = mount(el);
  c.setOption({
    ...base(),
    tooltip: tooltip(),
    legend: legend({ top: 0, right: 0 }),
    xAxis: { ...xAxis(), type: 'category', data: x, boundaryGap: false },
    yAxis: { ...yAxis(), type: 'value' },
    series: series.map(s => ({
      ...s, type: 'line', smooth: true, showSymbol: false,
      areaStyle: { opacity: 0.12 }, lineStyle: { width: 2 },
    })),
  });
  return c;
}

export function barChart(el, { categories, values, color }) {
  const c = mount(el);
  c.setOption({
    ...base(),
    tooltip: { ...tooltip(), axisPointer: { type: 'shadow' } },
    xAxis: { ...xAxis(), type: 'category', data: categories, axisLabel: { ...xAxis().axisLabel, interval: 0, rotate: categories.length > 5 ? 25 : 0 } },
    yAxis: { ...yAxis(), type: 'value' },
    series: [{
      type: 'bar', data: values,
      itemStyle: { color: color || SERIES.primary, borderRadius: [4, 4, 0, 0], ...outline() },
      barMaxWidth: 32,
    }],
  });
  return c;
}

export function stackedBarChart(el, { categories, series, formatter }) {
  const c = mount(el);
  c.setOption({
    ...base(),
    tooltip: {
      ...tooltip(),
      axisPointer: { type: 'shadow' },
      valueFormatter: formatter || (v => Number(v).toLocaleString()),
    },
    legend: legend({ top: 0, right: 0 }),
    xAxis: {
      ...xAxis(), type: 'category', data: categories,
      axisLabel: { ...xAxis().axisLabel, interval: categories.length > 20 ? 'auto' : 0, rotate: categories.length > 12 ? 45 : 0 },
    },
    yAxis: { ...yAxis(), type: 'value' },
    series: series.map((s, i) => ({
      name: s.name,
      type: 'bar',
      stack: 'total',
      data: s.values,
      itemStyle: { color: s.color || palette()[i % 6], ...outline() },
      barMaxWidth: 24,
      emphasis: { focus: 'series' },
    })),
  });
  return c;
}

export function groupedBarChart(el, { categories, series, formatter }) {
  const c = mount(el);
  c.setOption({
    ...base(),
    tooltip: {
      ...tooltip(),
      axisPointer: { type: 'shadow' },
      valueFormatter: formatter || (v => Number(v).toLocaleString()),
    },
    legend: legend({ top: 0, right: 0 }),
    xAxis: {
      ...xAxis(), type: 'category', data: categories,
      axisLabel: { ...xAxis().axisLabel, interval: 0, rotate: categories.length > 5 ? 25 : 0 },
    },
    yAxis: { ...yAxis(), type: 'value' },
    series: series.map((s, i) => ({
      name: s.name,
      type: 'bar',
      data: s.values,
      itemStyle: { color: s.color || palette()[i % 6], borderRadius: [4, 4, 0, 0], ...outline() },
      barMaxWidth: 24,
      emphasis: { focus: 'series' },
    })),
  });
  return c;
}

export function donutChart(el, data) {
  const c = mount(el);
  c.setOption({
    color: palette(),
    tooltip: {
      trigger: 'item',
      backgroundColor: T().panel, borderColor: T().edge, borderWidth: 1,
      textStyle: { color: T().ink, fontFamily: css('--sans') },
      formatter: p => `${p.name}<br/><b>${Number(p.value).toLocaleString()}</b> tokens (${p.percent.toFixed(1)}%)`,
    },
    legend: legend({ bottom: 10, type: 'scroll' }),
    series: [{
      type: 'pie',
      center: ['50%', '44%'],
      radius: ['48%', '68%'],
      avoidLabelOverlap: true,
      padAngle: 2,
      itemStyle: { ...outline(), borderRadius: 4 },
      label: {
        show: true,
        position: 'outside',
        color: T().ink,
        fontSize: 12,
        fontWeight: 600,
        formatter: ({ percent }) => percent >= 6 ? percent.toFixed(0) + '%' : '',
      },
      labelLine: { show: true, length: 6, length2: 6, lineStyle: { color: T().edge } },
      data,
    }],
  });
  return c;
}
