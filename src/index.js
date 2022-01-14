import "./style.css"
import HexagonPatch from "./HexagonPatch";
import atlas from "./atlas.json"
import Color from "./Color";
import centroid from "./util";
import randomPalette from "./randomPalette";


const PHI = (1 + Math.sqrt(5)) / 2;
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


const blue = Color.from("#0f427e")

const blipRate = 0.125

function drawInsideSquare(palette, face)
{
    const blip = []

    const {width, height} = config;

    const cx = width / 2;
    const cy = height / 2;

    const ce = centroid(face)

    let maxDistance = -Infinity
    let minDistance = Infinity

    let curr = face.halfEdge
    do
    {
        const { x, y } = curr.vertex


        const dx = ce.x - x
        const dy = ce.y - y


        const distSq = dx * dx + dy * dy

        if (distSq < minDistance)
        {
            minDistance = distSq
        }
        if (distSq > maxDistance)
        {
            maxDistance = distSq
        }
        curr = curr.next

    } while( curr !== face.halfEdge)

    const rnd = 0.4 + Math.random() * 0.218;
    minDistance = Math.pow(minDistance, rnd)
    maxDistance = Math.sqrt(maxDistance)

    const scaleCoords = (x,y,len) => {
        let dx = x - ce.x
        let dy = y - ce.y

        const dist = Math.sqrt(dx * dx + dy * dy)

        return [
            cx + ce.x + dx *len / dist,
            cy + ce.y + dy *len / dist,
        ]
    }


    const rombus = (distance, stroke, fill, blips) => {
        ctx.beginPath()
        curr = face.halfEdge
        let {x, y} = curr.vertex
        ctx.moveTo(...scaleCoords(x, y, distance))
        curr = curr.next

        do
        {
            const {x, y} = curr.vertex
            const [x1,y1] = scaleCoords(x, y, distance);
            ctx.lineTo(x1,y1)

            curr = curr.next

            if (blips && Math.random() < blipRate)
            {
                blip.push(x1,y1)
            }

        } while (curr !== face.halfEdge)
        ({x, y} = curr.vertex)
        ctx.lineTo(...scaleCoords(x, y, distance))

        if (stroke)
        {
            ctx.stroke()
        }
        if (fill)
        {
            ctx.fill()
        }

    };



    ctx.strokeStyle = "#000"
    ctx.lineWidth = 2
    rombus(minDistance, true, false);
    ctx.fillStyle = Color.from(palette[0|Math.random() * palette.length]).toRGBA(0.5)
    ctx.lineWidth = 4
    rombus(maxDistance, true, true, true);

    for (let i = 0; i < blip.length; i+=2)
    {
        const x = blip[i];
        const y = blip[i+1];

        const rnd = Math.random();
        const r = 2 + Math.pow(rnd, 12) * 64
        ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.5}`
        ctx.beginPath()
        ctx.moveTo(x+r,y)
        ctx.arc(x,y,r,0,TAU,true)
        ctx.fill()

        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.beginPath()
        ctx.moveTo(x,y - r)
        ctx.arc(x,y,r-1,-TAU/4,-TAU/2,true)
        ctx.stroke()
    }

}

function inScreen(face)
{
    const { width, height} = config

    let current = face.halfEdge
    do
    {
        const { x, y } = current.vertex;

        if (x < 0 || x >= width || y < 0 || y >= height)
        {
            return false
        }

        current = current.next
    } while (current !== face.halfEdge)

    return true
}

window.onload = (
    () => {

        canvas = document.getElementById("screen");
        ctx = canvas.getContext("2d");

        const width = (window.innerWidth) | 0;
        const height = (window.innerHeight) | 0;

        config.width = width;
        config.height = height;

        canvas.width = width;
        canvas.height = height;

        const paint = () => {

            const palette = randomPalette().slice();
            palette.push("#000")

            let gradient = ctx.createLinearGradient(0,0,0,height);
            gradient.addColorStop(0, palette[0|Math.random() * palette.length])
            gradient.addColorStop(1, palette[0|Math.random() * palette.length])
            ctx.fillStyle = gradient
            ctx.fillRect(0, 0, width, height)

            const patch = new HexagonPatch(0, 0, width/12)

            let faces = patch.build();

            console.log("FACES", faces.length, faces.map(f => f.length))

            const cx = width / 2
            const cy = height / 2

            ctx.strokeStyle = "#000"
            ctx.lineWidth = 2

            //faces = [ faces.find(inScreen) ]

            faces.forEach(face => {
                drawInsideSquare(palette, face)
            })


        };

        paint();

        window.addEventListener("click", paint, true)


    }
);




export default {}

