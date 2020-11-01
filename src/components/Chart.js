import React from 'react';
import View from '../lib/ui/View';
import { scaleBand, scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { select } from 'd3-selection';
import { transition } from 'd3-transition';
import { easeCubicIn } from 'd3-ease';
import { getMidiNoteByNr } from '../lib/Midi';
import { MIDI_NOTE_RANGES } from '../lib/Midi';
import { range } from 'd3-array';
import { schemeTableau10 } from 'd3-scale-chromatic';

export default class Chart extends View {

    constructor(props) {
        const margin = { top: 60, right: 20, bottom: 40, left: 180 };
        super(props, margin);
        const instruments = MIDI_NOTE_RANGES.slice();
        instruments.sort((a, b) => {
            if (a.type < b.type) { return -1; }
            if (a.type > b.type) { return 1; }
            if (a.min < b.min) { return -1; }
            if (a.min > b.min) { return 1; }
            if (a.max < b.max) { return -1; }
            if (a.max > b.max) { return 1; }
            return 0;
        });
        this.state = {
            ...this.state,
            // shownInstruments: [4, 5, 6, 7, 8, 9]
            shownInstruments: instruments.map((d, i) => i),
            instruments: instruments,
            colorMap: new Map([
                ['Brass', schemeTableau10[2]],
                ['Keys', schemeTableau10[0]],
                ['Strings', schemeTableau10[1]],
                ['Tuned percussion', schemeTableau10[4]],
                ['Woodwind', schemeTableau10[3]],
            ])
        };
    }

    componentDidMount = () => this.initialize();

    onResize = () => this.initialize();

    componentDidUpdate() {
        this.resizeComponent();
        if (this.state.initialized) {
            this.updateInstruments();
        }
    }

    initialize = () => {
        const { width, height } = this.state;
        const svg = select(this.svg);
        svg.selectAll('*').remove();
        // Scales
        const x = scaleLinear().range([0, width]).domain([0, 127]);
        const y = scaleBand().range([0, height]);
        // Axes
        const xAxis = axisBottom(x);
        const yAxis = axisLeft(y);
        xAxis.tickValues(range(0, 10 * 12 + 1, 12))
            .tickFormat(d => getMidiNoteByNr(d)?.label || '');
        const xAxisEl = svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0, ${height})`)
            .call(xAxis);
        const yAxisEl = svg.append('g')
            .attr('class', 'axis')
            .call(yAxis);

        // Grid for octaves
        this.setState({ initialized: true, svg, x, y, xAxis, yAxis, xAxisEl, yAxisEl });
    }

    // addInstrument = (index) => {
    //     console.log('add', index);

    //     const shownInstruments = this.state.shownInstruments.slice(0);
    //     // If already shown, return
    //     if (shownInstruments.includes(index)) {
    //         return;
    //     }
    //     shownInstruments.push(index);
    //     this.setState({ shownInstruments });
    // }

    // removeInstrument = (index) => {
    //     console.log('remove', index);

    //     let { shownInstruments } = this.state;
    //     // If not shown, return
    //     if (!shownInstruments.includes(index)) {
    //         return;
    //     }
    //     shownInstruments = shownInstruments.filter(d => d !== index);
    //     this.setState({ shownInstruments });
    // }

    updateInstruments = () => {
        const { svg, x, y, yAxis, yAxisEl, instruments, shownInstruments, colorMap } = this.state;
        y.domain(shownInstruments.map(d => instruments[d].label));
        yAxisEl.call(yAxis);

        const yOffset = y.bandwidth() * 0.1;
        const height = y.bandwidth() * 0.8;

        const t = transition()
            .duration(500)
            .ease(easeCubicIn);

        const rects = svg.selectAll('.bar')
            .data(shownInstruments.map(d => instruments[d]))
            .enter()
            .append('rect')
            .attr('class', 'bar')
            // .update()
            .attr('x', d => x(d.min))
            .attr('y', d => y(d.label) + yOffset)
            .attr('width', d => x(d.max - d.min))
            .attr('width', 0)
            .attr('height', 0)
            .attr('fill', d => colorMap.get(d.type))
        // .on('click', (e, d) => this.removeInstrument(instruments.indexOf(d)))
        // .exit()
        // .remove();

        rects.append('title')
            .text(
                d => `${d.label}: ${getMidiNoteByNr(d.min).label} - ${getMidiNoteByNr(d.max).label} (${d.min} - ${d.max})`
            );

        rects.transition(t)
            .attr('width', d => x(d.max - d.min + 1))
            .attr('height', height);
    }

    render() {
        const { viewWidth, viewHeight, width, height, margin, x, y, colorMap } = this.state;
        const y0 = y ? y(0) : 0;
        const legend = [];
        let currentX = margin.left;
        for (let [key, value] of colorMap) {
            legend.push((
                <text
                    key={key}
                    style={{ fill: value }}
                    x={currentX}
                    y={45}
                >
                    { key}
                </text >
            ));
            currentX += (width / colorMap.size);
        }
        // HTML
        return (
            <div
                className='View PitchTimeChart'
                style={{ gridArea: `span ${this.state.rowSpan} / span ${this.state.columnSpan}` }}
            >
                <svg
                    width={viewWidth}
                    height={viewHeight}
                >
                    <text
                        className='heading'
                        x={viewWidth / 2}
                        y={20}
                    >
                        Instrument Note Ranges
                    </text>
                    <g className='legend'>
                        {legend}
                    </g>
                    <g
                        className='background'
                        transform={`translate(${margin.left}, ${margin.top})`}
                    >
                        {x && range(1, 11).map(d => (
                            <rect
                                className='octaveMarker'
                                key={d}
                                x={x(d * 12)}
                                y={y0}
                                width={1}
                                height={height}
                            />
                        ))}
                    </g>
                    <g
                        ref={n => this.svg = n}
                        transform={`translate(${margin.left}, ${margin.top})`}
                    >
                        {x && range(10).map(d => (
                            <rect
                                className='octaveMarker'
                                key={d}
                                x={x(d * 12)}
                                y={y0}
                                width={1}
                                height={height}
                            />
                        ))}
                    </g>
                    <text
                        className='xAxisLabel'
                        x={viewWidth / 2}
                        y={viewHeight - 5}
                    >
                        Note range
                    </text>
                </svg>
            </div>
        );
    }
}
