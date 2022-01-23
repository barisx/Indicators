import { LineEvent, LineDirective, Point } from './types'
import { LineModel } from './line.model'

/**
 * Trend state Model
 * The trendModel object use Lines and lineDirectives to estimate current trend state
 */
export class TrendStateModel {
    in: {                                                                         // longer state
        state: null | 'unknown' | 'flat' | 'rise' | 'fall' | 'squeeze',
        lineIndex: number | null,
        line: LineModel | null
        size?: number
    }
    is: {                                                                         // current state
        state: null | 'flat' | 'rise' | 'fall',
        lineIndex: number | null,
        line: LineModel | null,
        size?: number
    }
    was: {                                                                       // prevues state
        state: null | 'flat' | 'rise' | 'fall',
        lineIndex: number,
        line: LineModel | null,
        size?: number
    }
    width: number                                           // longer state trend width
    speed: number                                           // longer state trend speed
    at: number                                              // time ago of the prevues state
    duration: number                                        // duration of the trend
    kdiff: number[] = []
    projection: number
    lines
    constructor(lines) {
        this.lines = lines
        this.in = {
            state: null,
            lineIndex: null,
            line: null
        }
        this.is = {
            state: null,
            lineIndex: null,
            line: null
        }
        this.was = {
            state: null,
            lineIndex: null,
            line: null
        }
        this.width = 0
        this.speed = 0
        this.at = 0
    }

    /**
          * Trend v 0.1.0
          * Headline not defined.
          * 1. The first long line appeared.
          * 2. The line is over, there is an opposite line, then a broken line in was (start and end points), change is to a new line
          * 3. We are waiting for the end of this trend (oncoming movement), if there is an opposite line, then the broken line in was, change is,
          * set in to the state on the new line.
          * Otherwise, we skip this step, wait for the line to be restored and the next break.
          */
    hlMaxDuration: LineModel | null
    llMaxDuration: LineModel | null

    update(hLinesIDs: number[], lLinesIDs: number[]) {
        //Wait for the first tern
        //Init
        if (hLinesIDs.length > 1)
            this.hlMaxDuration = hLinesIDs.map(lineID => this.lines.id[lineID]).reduce((prev, current) => {
                return (prev.length > current.length) ? prev : current
            })
        else this.hlMaxDuration = this.lines.id[hLinesIDs[0]]
        if (lLinesIDs.length > 1)
            this.llMaxDuration = lLinesIDs.map(lineID => this.lines.id[lineID]).reduce((prev, current) => {
                return (prev.length > current.length) ? prev : current
            })
        else this.llMaxDuration = this.lines.id[lLinesIDs[0]]

        if (this.is.state == null && this.was.state == null) {
            // Возьмем минимальную длительность тренда = 5 свечей
            let firstTimeFrame = 5
            this.is.line = (this.llMaxDuration && this.llMaxDuration.length > firstTimeFrame && this.hlMaxDuration.length < firstTimeFrame) ? this.llMaxDuration //hLines
                : ((this.hlMaxDuration && this.hlMaxDuration.length > firstTimeFrame && this.llMaxDuration.length < firstTimeFrame) ? this.hlMaxDuration : null)
            if (this.is.line) {
                this.is.lineIndex = this.is.line.index
                this.is.state = this.is.line.type == 'h' ? 'fall' : 'rise'
            }
        }

        if (this.is.state) {
            // Wait from the break
            if (this.lines.id[this.is.lineIndex].rollback) {
                // Calculate and compare was and is
                this.is.size = this.is.line.startPoint.y - this.is.line.thisPoint.y
                this.in.size = this.was.size + this.is.size
                // Copy is to was
                this.was = { ...this.is }
                // Update is
                if (this.is.state == "fall" ? this.llMaxDuration.length > 1 : this.hlMaxDuration.length > 1) {
                    this.is.line = this.is.state == "fall" ? this.llMaxDuration : this.hlMaxDuration
                    this.is.state = this.is.line.type == 'h' ? 'fall' : 'rise'
                    this.is.lineIndex = this.is.line.index
                }
            }
        }

        return [(this.is.state && this.is.state == 'fall') ? 2780 : 2800]
    }
}