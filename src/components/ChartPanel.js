import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import * as echarts from 'echarts';

export default function ChartPanel({
 lines,
 filteredLines,
 extractors,
 xAxisMode,
 onXAxisModeChange,
 xAxisField,
 onXAxisFieldChange,
 thresholds,
 annotations,
 onJumpToLine,
 chartLinkedLine,
 keywords,
}) {
 const chartRef = useRef(null);
 const chartInstance = useRef(null);

 // Extract data from lines using regex extractors
 const chartData = useMemo(() => {
 if (extractors.length === 0 || lines.length === 0) return null;

 console.log(`[ChartPanel] Processing ${lines.length} lines with ${extractors.length} extractors`);

 const results = [];
 const regexes = extractors.map(e => {
 try { return { name: e.name, regex: new RegExp(e.regex), color: e.color }; }
 catch { return null; }
 }).filter(Boolean);

 if (regexes.length === 0) return null;

 // Limit to 20000 lines for performance
 const linesToProcess = lines.length > 20000 ? lines.slice(0, 20000) : lines;

 for (const line of linesToProcess) {
 const point = { lineNum: line.num, text: line.text };
 let hasData = false;

 // Extract time if present
 const timeMatch = line.text.match(/(\d{4}[-/]\d{2}[-/]\d{2}[\sT]\d{2}:\d{2}:\d{2})/);
 if (timeMatch) point.time = timeMatch[1];

 // Extract values using regexes
 for (const r of regexes) {
 const match = line.text.match(r.regex);
 if (match && match[1]) {
 const val = parseFloat(match[1]);
 if (!isNaN(val)) {
 point[r.name] = val;
 hasData = true;
 }
 }
 }

 if (hasData) results.push(point);
 }

 console.log(`[ChartPanel] Extracted ${results.length} data points`);
 return results;
 }, [lines, extractors]);

 // Detect auto-annotations: keyword value changes and isConverge status
 const autoAnnotations = useMemo(() => {
 if (!chartData || chartData.length < 2) return [];
 const result = [];
 const metricNames = extractors.map(e => e.name);

 // Detect isConverge status changes
 for (let i = 1; i < chartData.length; i++) {
 const prev = chartData[i - 1]['isConverge'];
 const curr = chartData[i]['isConverge'];
 if (prev !== undefined && curr !== undefined && prev !== curr) {
 const status = curr === 1 ? '✓ 已稳定' : '!️ 未稳定';
 result.push({
 lineNum: chartData[i].lineNum,
 text: `状态变化: ${status}`,
 type: 'converge',
 seqNum: chartData[i]['seqNum'] || i,
 });
 }
 }

 // Detect significant luma changes (>30%)
 for (const metric of metricNames.filter(m => m !== 'seqNum' && m !== 'isConverge')) {
 for (let i = 1; i < chartData.length; i++) {
 const prev = chartData[i - 1][metric];
 const curr = chartData[i][metric];
 if (prev !== undefined && curr !== undefined && prev > 0) {
 const change = Math.abs(curr - prev);
 const threshold = Math.abs(prev) * 0.3; // 30% change
 if (change > threshold && change > 2) {
 result.push({
 lineNum: chartData[i].lineNum,
 text: `${metric}: ${prev.toFixed(2)} → ${curr.toFixed(2)}`,
 type: 'luma_change',
 seqNum: chartData[i]['seqNum'] || i,
 });
 }
 }
 }
 }
 return result;
 }, [chartData, extractors]);

 // Render chart
 useEffect(() => {
 if (!chartRef.current) {
   console.log('[ChartPanel] chartRef is null, skipping init');
   return;
 }

 if (!chartInstance.current) {
   console.log('[ChartPanel] Initializing ECharts');
   chartInstance.current = echarts.init(chartRef.current, null, { renderer: 'canvas' });
 }

 const chart = chartInstance.current;

 if (!chartData || chartData.length === 0) {
 console.log('[ChartPanel] No chartData, clearing chart. lines.length=' + lines.length + ' extractors.length=' + extractors.length);
 chart.clear();
 chart.setOption({
 title: { text: '配置数据提取器以生成图表', left: 'center', top: 'center', textStyle: { color: '#6c7086', fontSize: 14 } },
 });
 return;
 }

 console.log('[ChartPanel] Rendering chart with ' + chartData.length + ' points');

 // Filter out seqNum and isConverge from series (they're used for X-axis and annotations)
 const metricNames = extractors.map(e => e.name).filter(n => n !== 'seqNum' && n !== 'isConverge');

 // Build X axis data - prioritize seqNum if available
 let xData;
 if (xAxisMode === 'data') {
 // Try to use seqNum first, then xAxisField, then lineNum
 xData = chartData.map(d => {
 if (d['seqNum'] !== undefined) return d['seqNum'];
 if (xAxisField && d[xAxisField] !== undefined) return d[xAxisField];
 return d.lineNum;
 });
 } else if (xAxisMode === 'time') {
 xData = chartData.map(d => d.time || `L${d.lineNum}`);
 } else {
 xData = chartData.map(d => d.lineNum);
 }

 // Build series - only for luma metrics
 const series = metricNames.map(name => ({
 name,
 type: 'line',
 data: chartData.map(d => d[name] !== undefined ? d[name] : null),
 smooth: true,
 symbol: 'circle',
 symbolSize: 3,
 lineStyle: { width: 2 },
 itemStyle: { color: extractors.find(e => e.name === name)?.color || '#89b4fa' },
 emphasis: { focus: 'series' },
 }));

 // Add threshold lines as markLine
 for (const th of thresholds) {
 if (th.metric && metricNames.includes(th.metric)) {
 const seriesIdx = metricNames.indexOf(th.metric);
 if (series[seriesIdx]) {
 if (!series[seriesIdx].markLine) {
 series[seriesIdx].markLine = { data: [], symbol: 'none', lineStyle: { type: 'dashed', width: 2 } };
 }
 series[seriesIdx].markLine.data.push({
 name: th.name,
 yAxis: th.value,
 lineStyle: { color: th.color },
 label: { formatter: `${th.name}: ${th.value}`, color: th.color },
 });
 }
 }
 }

 // Add auto-annotations as vertical markLines (for isConverge status changes)
 if (series.length > 0) {
 const markLines = [];
 
 for (const anno of autoAnnotations) {
 const idx = chartData.findIndex(d => d.lineNum === anno.lineNum);
 if (idx >= 0) {
 const isStable = anno.type === 'converge' && anno.text.includes('已稳定');
 markLines.push({
 xAxis: idx,
 label: {
 show: true,
 formatter: anno.text,
 position: 'start',
 fontSize: 10,
 color: isStable ? '#a6e3a1' : '#f9e2af',
 },
 lineStyle: {
 color: isStable ? '#a6e3a1' : '#f9e2af',
 type: 'dashed',
 width: 1,
 },
 });
 }
 }
 
 // Add markLines to all series
 for (const s of series) {
 s.markLine = {
 data: markLines,
 symbol: 'none',
 silent: false,
 };
 }
 }
 
 // Add user annotations as markPoints
 const allAnnotationPoints = [];
 for (const [lineNum, text] of Object.entries(annotations)) {
 const ln = parseInt(lineNum);
 const idx = chartData.findIndex(d => d.lineNum === ln);
 if (idx >= 0 && series.length > 0) {
 const firstMetric = metricNames[0];
 if (chartData[idx][firstMetric] !== undefined) {
 allAnnotationPoints.push({
 coord: [idx, chartData[idx][firstMetric]],
 value: text,
 itemStyle: { color: '#89b4fa' },
 label: { show: true, formatter: ` ${text.substring(0, 15)}`, fontSize: 10, color: '#89b4fa' },
 });
 }
 }
 }

 if (allAnnotationPoints.length > 0 && series[0]) {
 if (!series[0].markPoint) {
 series[0].markPoint = { data: [], symbol: 'pin', symbolSize: 40 };
 }
 series[0].markPoint.data = allAnnotationPoints;
 }

 // Highlight linked point
 if (chartLinkedLine) {
 const linkedIdx = chartData.findIndex(d => d.lineNum === chartLinkedLine);
 if (linkedIdx >= 0) {
 for (const s of series) {
 if (!s.markPoint) s.markPoint = { data: [] };
 s.markPoint.data.push({
 coord: [linkedIdx, chartData[linkedIdx][s.name]],
 symbol: 'diamond',
 symbolSize: 12,
 itemStyle: { color: '#f38ba8' },
 });
 }
 }
 }

 const option = {
 backgroundColor: 'transparent',
 tooltip: {
 trigger: 'axis',
 backgroundColor: '#1e1e2e',
 borderColor: '#45475a',
 textStyle: { color: '#cdd6f4', fontSize: 12 },
 formatter: (params) => {
 if (!params.length) return '';
 const idx = params[0].dataIndex;
 const point = chartData[idx];
 let html = `<div style="margin-bottom:4px;color:#a6adc8">行 ${point.lineNum}</div>`;
 if (point.time) html += `<div style="color:#6c7086;font-size:11px">${point.time}</div>`;
 for (const p of params) {
 html += `<div><span style="color:${p.color}">●</span> ${p.seriesName}: <b>${p.value}</b></div>`;
 }
 // Show annotations for this line
 if (annotations[point.lineNum]) {
 html += `<div style="margin-top:4px;color:#89b4fa"> ${annotations[point.lineNum]}</div>`;
 }
 return html;
 },
 },
 legend: {
 data: metricNames,
 top: 0,
 textStyle: { color: '#a6adc8' },
 selectedMode: 'multiple',
 },
 grid: {
 left: 50,
 right: 20,
 top: 40,
 bottom: 30,
 },
 xAxis: {
 type: 'category',
 data: xData,
 axisLabel: { color: '#6c7086', fontSize: 10, rotate: xData.length > 20 ? 45 : 0 },
 axisLine: { lineStyle: { color: '#45475a' } },
 },
 yAxis: {
 type: 'value',
 axisLabel: { color: '#6c7086', fontSize: 10 },
 axisLine: { lineStyle: { color: '#45475a' } },
 splitLine: { lineStyle: { color: '#313244' } },
 },
 series,
 dataZoom: [
 { type: 'inside', start: 0, end: 100 },
 { type: 'slider', bottom: 0, height: 20, textStyle: { color: '#6c7086' } },
 ],
 };

 chart.setOption(option, true);

 // Force resize after render to fix invisible chart on first mount
 setTimeout(() => { chart.resize(); }, 100);

 // Click handler for chart ↔ log linkage
 chart.off('click');
 chart.on('click', (params) => {
 if (params.dataIndex !== undefined && chartData[params.dataIndex]) {
 onJumpToLine(chartData[params.dataIndex].lineNum);
 }
 });

 // Resize
 const handleResize = () => chart.resize();
 window.addEventListener('resize', handleResize);
 return () => window.removeEventListener('resize', handleResize);
 }, [chartData, extractors, xAxisMode, xAxisField, thresholds, autoAnnotations, annotations, chartLinkedLine, onJumpToLine]);

 // Export chart as image (download via browser)
 const handleExportPNG = useCallback(() => {
 if (!chartInstance.current) return;
 const url = chartInstance.current.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#1e1e2e' });
 const a = document.createElement('a');
 a.href = url;
 a.download = 'chart.png';
 a.click();
 }, []);

 // Export CSV
 const handleExportCSV = useCallback(async () => {
 if (!chartData || chartData.length === 0) return;
 const savePath = await window.api.exportCSV();
 if (!savePath) return;

 const metricNames = extractors.map(e => e.name);
 const headers = ['LineNum', 'Time', ...metricNames];
 const rows = chartData.map(d => [
 d.lineNum,
 d.time || '',
 ...metricNames.map(m => d[m] !== undefined ? d[m] : ''),
 ]);
 const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
 await window.api.saveCSV(savePath, csv);
 }, [chartData, extractors]);

 return (
 <div>
 {/* X Axis selector */}
 <div className="axis-selector">
 <label>X轴:</label>
 <select value={xAxisMode} onChange={e => onXAxisModeChange(e.target.value)}>
 <option value="line">行号</option>
 <option value="time">时间戳</option>
 <option value="data">数据字段</option>
 </select>
 {xAxisMode === 'data' && (
 <input
 className="toolbar-input"
 style={{ width: 120, minWidth: 100 }}
 placeholder="字段名"
 value={xAxisField}
 onChange={e => onXAxisFieldChange(e.target.value)}
 />
 )}
 </div>

 {/* Chart */}
 <div ref={chartRef} className="chart-container" />

 {/* Export buttons */}
 <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
 <button className="toolbar-btn" onClick={handleExportPNG}> 导出PNG</button>
 <button className="toolbar-btn" onClick={handleExportCSV}> 导出CSV</button>
 </div>

 {/* Auto annotations list */}
 {autoAnnotations.length > 0 && (
 <div style={{ marginTop: 12 }}>
 <div style={{ fontSize: 12, color: '#a6adc8', marginBottom: 6 }}>
 自动检测到 {autoAnnotations.length} 个变化点:
 </div>
 <div style={{ maxHeight: 120, overflow: 'auto' }}>
 {autoAnnotations.slice(0, 20).map((a, i) => (
 <div
 key={i}
 style={{
 padding: '4px 8px', fontSize: 11, color: '#f9e2af',
 cursor: 'pointer', borderRadius: 4,
 }}
 onClick={() => onJumpToLine(a.lineNum)}
 className="annotation-item"
 >
 <span className="annotation-line-num">L{a.lineNum}</span>
 <span className="annotation-text">{a.text}</span>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 );
}
