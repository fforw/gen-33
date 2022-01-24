import "./style.css"
import { orient2d } from "robust-predicates"
import { canvasRGB } from "stackblur-canvas"
import { polygonContains } from "d3-polygon"
import HexagonPatch from "./HexagonPatch";
import Color from "./Color";
import randomPalette, { randomPaletteWithBlack } from "./randomPalette";
import AABB from "./AABB";
import weightedRandom from "./weightedRandom";


const PHI = (1 + Math.sqrt(5)) / 2;
const phiH = 1/(PHI * PHI)
const TAU = Math.PI * 2;
const DEG2RAD_FACTOR = TAU / 360;

const config = {
    width: 0,
    height: 0
};

/**
 * @type CanvasRenderingContext2D
 */
let ctx;
let canvas;

/**
 * @type CanvasRenderingContext2D
 */
let debugCtx;
let debugCanvas;

function drawArrow(x0, y0, x1, y1)
{
    const { width, height} = config;

    const cx = width/2;
    const cy = height/2;

    const dy = y1 - y0;
    const dx = x1 - x0;

    if (dx * dx + dy * dy > 2)
    {
        const nx = dy * 0.08
        const ny = -dx * 0.08

        const start = 0.01
        const end = 0.5

        const x2 = x0 + (x1 - x0) * start
        const y2 = y0 + (y1 - y0) * start
        const x3 = x0 + (x1 - x0) * end
        const y3 = y0 + (y1 - y0) * end

        const x4 = x0 + (x1 - x0) * (start + (end - start) * 0.6)
        const y4 = y0 + (y1 - y0) * (start + (end - start) * 0.6)

        debugCtx.beginPath()
        debugCtx.moveTo(cx + x2, cy + y2)
        debugCtx.lineTo(cx + x3, cy + y3)

        debugCtx.moveTo(cx + x3, cy + y3)
        debugCtx.lineTo(cx + x4 + nx, cy + y4 + ny)
        debugCtx.moveTo(cx + x3, cy + y3)
        debugCtx.lineTo(cx + x4 - nx, cy + y4 - ny)
        debugCtx.stroke()
    }
}


/**
 * @typedef {{polygon: array<number>, aabb: AABB}} data
 *
 * @type {Map<number, data>}
 */
const polygonCache = new Map()

function getPolygonData(face)
{
    let data = polygonCache.get(face);
    if (data)
    {
        return data
    }

    const polygon = []
    const aabb = new AABB()
    const first = face.halfEdge;
    let curr = first
    do
    {
        const { x, y} = curr.vertex

        aabb.add(x,y)
        polygon.push([
            x,
            y
        ])
        curr = curr.next

    } while (curr !== first)

    data = {
        polygon,
        aabb
    }

    //console.log("DATA", data)

    polygonCache.set(face, data)
    return data
}

function flush(face)
{
    polygonCache.delete(face)
}


function findFaceAtMouseCoords()
{
    const { width, height} = config;

    const cx = width/2;
    const cy = height/2;

    const mx = mouseX - cx;
    const my = mouseY - cy;

    const mousePoint = [mx,my];
    for (let i = 0; i < faces.length; i++)
    {

        const face = faces[i];
        const { aabb, polygon } = getPolygonData(face)
        if (
            mx >= aabb.minX &&
            my >= aabb.minY &&
            mx < aabb.maxX &&
            my < aabb.maxY
        )
        {
            if (polygonContains(polygon, mousePoint))
            {
                return face
            }
        }
    }
    return null
}


function findEdgeClosestToMouse()
{
    let minSq = Infinity
    const { width, height} = config;

    const cx = width/2;
    const cy = height/2;

    let result = {
        x0: 0,
        y0: 0,
        x1: 0,
        y1: 0,
        face: null,
        halfEdge: null,
    }

    const face = findFaceAtMouseCoords()
    if (!face)
    {
        return result
    }

    result.face = face

    const first = face.halfEdge
    let curr = first
    do
    {
        const next = curr.next;
        const { x : x0, y : y0 } = curr.vertex
        const { x : x1, y : y1 } = next.vertex

        const mx = (x0 + x1)/2
        const my = (y0 + y1)/2

        const dx = (mouseX - cx) - mx
        const dy = (mouseY - cy) - my

        const distSq = dx * dx + dy * dy

        if (distSq < minSq && curr.twin)
        {
            minSq = distSq
            result.x0 = cx + x0
            result.y0 = cy + y0
            result.x1 = cx + x1
            result.y1 = cy + y1
            result.halfEdge = curr
        }
        curr = next
    }  while (curr !== first)

    return result
}


function renderDebugFace(face, drawNext = false, ids = false)
{
    const { width, height} = config;

    const cx = width/2;
    const cy = height/2;

    const faceCentroid = face.centroid

    if (ids)
    {
        const label = String(face.id);
        const tm = debugCtx.measureText(label);
        debugCtx.fillText(label, cx + faceCentroid[0] - tm.width/2, cy + faceCentroid[1] + 4)
    }
    else
    {
        debugCtx.fillStyle = "#0f0"
        debugCtx.fillRect(cx + faceCentroid[0] - 2, cy + faceCentroid[1] - 2, 4, 4)
    }

    const first = face.halfEdge;
    let curr = first;

    debugCtx.save()
    debugCtx.fillStyle = Color.fromHSL(Math.random(), 0.8, 0.5).toRGBHex()

    debugCtx.strokeStyle = "#000"
    debugCtx.beginPath()


    const set = new Set()
    do
    {
        const next = curr.next;


        const x0 = 0|(cx + curr.vertex.x)
        const y0 = 0|(cy + curr.vertex.y)
        const x1 = 0|(cx + next.vertex.x)
        const y1 = 0|(cy + next.vertex.y)


        if (set.has(curr))
        {
            console.error("Face broke")
            return
        }
        set.add(curr)

        if (curr === first)
        {
            debugCtx.moveTo(x0, y0)
        }
        debugCtx.lineTo(x1, y1)

        curr = next
    }  while (curr !== first)
    debugCtx.stroke()
    debugCtx.restore()

    curr = first
    do
    {
        const next = curr.next;

        const x0 = 0|(cx + curr.vertex.x)
        const y0 = 0|(cy + curr.vertex.y)
        const x1 = 0|(cx + next.vertex.x)
        const y1 = 0|(cy + next.vertex.y)

        const x2 = 0|((x0 + x1)/2 - cx)
        const y2 = 0|((y0 + y1)/2 - cy)

        if (drawNext)
        {
            const { twin }  = curr;
            if (twin)
            {
                const [ x0, y0 ] = faceCentroid;

                debugCtx.strokeStyle = "#999"
                drawArrow(x2, y2, x0, y0);
            }

        }

        curr = next
    }  while (curr !== first)
}

function connectsFaces(node, face, other)
{
    let fa = node.face
    let fb = node.twin ? node.twin.face : null

    return (face === fa && other === fb) || (face === fb && other === fa)
}

function isOneOf(node, fa, fb)
{
    const face = node.face
    return (face === fa || face === fb)
}

function findNonSharedEdge(face, other)
{
    const first = face.halfEdge;
    let curr = first;
    do
    {
        if (!connectsFaces(curr, face, other))
        {
            return curr
        }

        curr = curr.next
    } while (curr !== first)

    throw new Error("No edge found that is not shared by face #" + face.id + " and face #" + other.id)
}


function isEnclosed(f, face)
{
    const first = f.halfEdge;

    let curr = first
    do
    {
        if (curr.twin.face !== face)
        {
            return false
        }

        curr = curr.next
    } while( curr !== first )

    return true;
}


function getCoincidentCount(faceA, faceB)
{
    const pts = new Set();

    const firstA = faceA.halfEdge
    let curr = firstA
    do
    {
        pts.add(curr.vertex)
        curr = curr.next
    }  while (curr !== firstA)

    const firstB = faceB.halfEdge
    curr = firstB
    let count = 0
    do
    {
        if (pts.has(curr.vertex))
        {
            count++;
        }
        curr = curr.next
    }  while (curr !== firstB)

    console.log("getCoincidentCount", faceA, faceB, "=>", count)

    return count;
}


function removeComplexEdge(halfEdge)
{
    //console.log("removeComplexEdge", halfEdge)

    if (!halfEdge.twin)
    {
        console.log("No twin")
        return
    }

    let face = halfEdge.face
    let other = halfEdge.twin.face

    if ((getCoincidentCount(face, other) & 1) === 1)
    {
        console.log("Removing would enclose: count = ")
        return;
    }

    //console.log("Expand face #", face.id, " by removing #", other.id)

    faces = faces.filter( f => f !== other)

    const start = findNonSharedEdge(face, other);
    face.halfEdge = start

    let curr = start
    let prev = null;
    const visited = new Set()
    do
    {
        if (connectsFaces(curr, face, other))
        {
            const { next } = curr.twin;
            //console.log("switch from #", curr.id, " to twin #", next.id)
            prev.next = next
            curr = next
        }
        else
        {
            //console.log("curr = node #", curr.id)
            visited.add(curr)

            if (curr.face === other)
            {
                //console.log("Correct face on #", curr.id)
                curr.face = face
            }

            prev = curr
            curr = curr.next
        }

    } while( !visited.has(curr) )

    // if (curr !== start)
    // {
    //     console.log("Not at start")
    // }

    //console.log("End face at #", curr.id)
    flush(face)
}

let mouseX, mouseY

let faces

let closest

function validate(faces)
{
    const edgeCount = new Map()

    for (let i = 0; i < faces.length; i++)
    {
        const face = faces[i];
        const first = face.halfEdge
        let curr = first
        do
        {
            const { next } = curr;
            const { x: x0, y: y0 } = curr.vertex

            const k = x0 + "/" + y0;
            edgeCount.set(k, (edgeCount.get(k) || 0) + 1 )
            curr = next
        } while (curr !== first)
    }

}


function getLength(face)
{

    let count = 0
    const first = face.halfEdge;
    let curr = first
    do
    {
        count++
        curr = curr.next
    } while (curr !== first )

    return count
}


function randomHalfEdge(face, exclude = null)
{
    const first = face.halfEdge;

    let e = [];
    let curr = first
    do
    {
        if (curr.twin && (exclude === null || curr.edge !== exclude))
        {
            e.push(curr);
        }

        curr = curr.next
    } while (curr !== first)

    return e[0|Math.random() * e.length];
}

const NO_STROKE = { stroke: null };

function findTwinStroke(face)
{
    const first = face.halfEdge;
    let curr = first
    do
    {
        const { twin } = curr;
        if (twin)
        {
            const { stroke } = twin.face

            if (stroke)
            {
                return {halfEdge: twin, stroke}
            }
        }
        curr = curr.next
    } while (curr !== first )

    return NO_STROKE;
}

const debug = false;

const black = Color.from("#000")
const tmpA = new Color(0,0,0)
const tmpB = new Color(0,0,0)
const tmpC = new Color(0,0,0)
const tmpD = new Color(0,0,0)

const nextHalfEdge = weightedRandom([
    1, twin => twin,
    2, twin => twin.next,
    4, twin => twin.next.next,
    2, twin => twin.next.next.next,
])


const MULTIPLIER = [0,0,0,0]

function getMultiplier(halfEdge)
{
    const multiplier = MULTIPLIER.slice()
    let pos = 0
    let curr = halfEdge
    do
    {
        multiplier[pos++] = curr.twin ? 1/curr.twin.face.stroked : 1

        curr = curr.next
    } while (curr !== halfEdge )


    //console.log("MULT", halfEdge, multiplier)
    return multiplier;
}


function randomFace()
{
    return faces[0|Math.random()*faces.length];
}


/**
 *
 * @param size
 * @param blackness
 * @param offset
 *
 * @constructor
 */
function Bristle(size, blackness, offset)
{
    this.size = size
    this.blackness = blackness
    this.offset = offset
}

class Brush
{
    /**
     * @type {number}
     */
    x
    /**
     * @type {number}
     */
    y
    /**
     * @type {Array<Bristle>}
     */
    bristles

    constructor(bristles)
    {
        this.bristles = bristles
    }

    flip()
    {
        let {bristles} = this

        for (let i = 0; i < bristles.length; i++)
        {
            const bristle = bristles[i];
            bristle.offset = 1 - bristle.offset
        }
    }

    stroke(halfEdgeA, halfEdgeB, halfEdgeC, colorA, colorB)
    {
        let {x,y,bristles} = this

        const { width, height} = config;

        const hw = width/2;
        const hh = height/2;

        if (x === undefined)
        {
            
        }

        const pos = (node, offset) => {

            const x0 = node.vertex.x
            const y0 = node.vertex.y
            const x1 = node.next.vertex.x
            const y1 = node.next.vertex.y

            return [
                x0 + (x1 - x0) * offset,
                y0 + (y1 - y0) * offset,
            ];
        }

        const [ x0, y0 ] = pos(halfEdgeA, 0.5)
        const [ x1, y1 ] = pos(halfEdgeC, 0.5)


        for (let i = 0; i < bristles.length; i++)
        {
            const {size, blackness, offset} = bristles[i];

            colorA.mix(black, blackness, tmpC)
            colorB.mix(black, blackness, tmpD)

            const gradient = ctx.createLinearGradient(x0,y0,x1,y1);
            gradient.addColorStop(0, tmpC.toRGBA(0.3))
            gradient.addColorStop(1, tmpD.toRGBA(0.3))
            ctx.strokeStyle = gradient

            const [ ax, ay ] = pos(halfEdgeA, offset)
            const [ bx, by ] = pos(halfEdgeB,  1 - offset)
            const [ cx, cy ] = pos(halfEdgeC, 1 - offset)

            const xm = (ax + cx)/2
            const ym = (ay + cy)/2
            const dx = bx - xm
            const dy = by - ym

            ctx.save()
            ctx.lineWidth = size
            ctx.beginPath()
            ctx.moveTo(hw + ax, hh + ay)
            ctx.quadraticCurveTo(hw + xm + dx * 2, hh + ym + dy * 2, hw + cx, hh + cy)
            ctx.stroke()
            ctx.restore()

        }

    }

}


window.onload = (
    () => {

        canvas = document.getElementById("screen");
        ctx = canvas.getContext("2d");

        debugCanvas = document.getElementById("debug");

        if (!debug)
        {
            debugCanvas.style.display = "none"
        }
        debugCtx = debugCanvas.getContext("2d");

        const width = (window.innerWidth) | 0;
        const height = (window.innerHeight) | 0;

        config.width = width;
        config.height = height;

        canvas.width = width;
        canvas.height = height;

        debugCanvas.width = width;
        debugCanvas.height = height;

        debugCtx.clearRect(0,0,width,height)

        const cx = width/2;
        const cy = height/2;

        const animate = () => {
            debugCtx.clearRect(0, 0, width, height)

            faces.forEach(face => {
                debugCtx.lineWidth = 1
                debugCtx.strokeStyle = "#000"

                renderDebugFace(face, false);
            })

            const { halfEdge } = closest
            if (halfEdge)
            {
                const {x0,y0,x1,y1, face } = closest

                debugCtx.fillStyle = Color.from("#f6f").toRGBA(0.5)
                debugCtx.strokeStyle = "#f6f"

                const first = face.halfEdge;
                let curr = first
                debugCtx.beginPath()
                debugCtx.moveTo(cx + curr.vertex.x, cy + curr.vertex.y)
                curr = curr.next
                do
                {
                    debugCtx.lineTo( cx + curr.vertex.x, cy + curr.vertex.y)
                    curr = curr.next
                } while (curr !== first )
                debugCtx.fill()

                const x2 = 0|((x0 + x1)/2 - cx)
                const y2 = 0|((y0 + y1)/2 - cy)

                if (halfEdge.twin)
                {
                    const [ x3, y3 ] = halfEdge.twin.face.centroid;
                    drawArrow(x2, y2, x3, y3);
                }
            }

        };


        const paint = () => {

            //ctx.fillStyle = "#16161d"

            const strokeLimit = 3
            const numStrokes = 20
            const streakiness = 0.25
            const streakLimit = 5
            const variance = 0//Math.pow(Math.random(),3) * 0.4
            const strokeVariance = 47

            const palette = randomPaletteWithBlack()

            ctx.fillStyle = palette[0]
            ctx.fillRect(0,0,width,height)

            const patch = new HexagonPatch(0, 0, Math.round(width * (0.2 - Math.random() * 0.16)))

            faces = patch.build();


            const repeat = 500 + Math.random() * 500
            // const layerMax = Math.round(repeat * 1)//0.3333);
            // let count = 0;
            let layer = 0;

            let len = 0;

            let halfEdgeA, halfEdgeB
            const strokeColor = Color.from(palette[0 | Math.random() * palette.length]);


            function randomBrush()
            {
                return new Brush(Array.from({length: 60}).map(() => new Bristle(
                    Math.round(2 + Math.pow(Math.random(), 3) * 6),
                    Math.random() < 0.15 ? 0.2 + Math.random() * 0.2 : Math.random() * 0.05,
                    Math.random()
                )));
            }


            let brush

            let count = 0;
            do
            {
                if (len-- <= 0)
                {
                    len = 3 + Math.random() * 10
                    brush = randomBrush()
                    halfEdgeA = randomHalfEdge(randomFace())
                }

                if (!halfEdgeA)
                {
                    halfEdgeA = randomHalfEdge(randomFace())
                }
                halfEdgeB = halfEdgeA.next.next

                
                if (!halfEdgeB.twin)
                {
                    halfEdgeA = null
                    continue
                }

                const halfEdgeC = nextHalfEdge([halfEdgeB.twin], getMultiplier(halfEdgeB.twin))

                const { face: faceA } = halfEdgeA
                const { face: faceB } = halfEdgeC

                faceA.stroked++
                faceB.stroked++

                faceA.color = faceA.color || Color.from(palette[0|Math.random() * palette.length])
                faceB.color = faceB.color || Color.from(palette[0|Math.random() * palette.length])

                faceA.color.mix(strokeColor, 0.5, tmpA)
                faceB.color.mix(strokeColor, 0.5, tmpB)

                brush.stroke(
                    halfEdgeA,
                    halfEdgeB,
                    halfEdgeC,
                    tmpA,
                    tmpB
                )

                halfEdgeA = halfEdgeC.twin
                //brush.flip()

            } while (count++ < repeat)

            closest = findEdgeClosestToMouse()

            //console.log("FACES", faces.length, faces.map(f => f.length))

            mouseX = width / 2
            mouseY = height / 2

            requestAnimationFrame(animate)

        };

        paint();

        (debug ? debugCanvas : canvas).addEventListener("click", paint, true)

        // debugCanvas.addEventListener("click", () => {
        //
        //     const { halfEdge } = closest
        //     if (halfEdge)
        //     {
        //         removeComplexEdge(closest.halfEdge)
        //         requestAnimationFrame(animate)
        //
        //     }
        // }, true)
        debugCanvas.addEventListener("mousemove", ev => {

            const rect = canvas.getBoundingClientRect();

            mouseX = ev.clientX - rect.x
            mouseY = ev.clientY - rect.y

            const cl = findEdgeClosestToMouse()
            if (cl.halfEdge !== closest.halfEdge)
            {
                requestAnimationFrame(animate)
            }
            closest = cl
            

        }, true)


    }
);




export default {}

