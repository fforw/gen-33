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
let blipPower

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

        ctx.beginPath()
        ctx.moveTo(cx + x2, cy + y2)
        ctx.lineTo(cx + x3, cy + y3)

        ctx.moveTo(cx + x3, cy + y3)
        ctx.lineTo(cx + x4 + nx, cy + y4 + ny)
        ctx.moveTo(cx + x3, cy + y3)
        ctx.lineTo(cx + x4 - nx, cy + y4 - ny)
        ctx.stroke()
    }
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
        const tm = ctx.measureText(label);
        ctx.fillText(label, cx + faceCentroid[0] - tm.width/2, cy + faceCentroid[1] + 4)
    }
    else
    {
        //ctx.fillRect(cx + faceCentroid[0] - 1, cy + faceCentroid[1] - 1, 2, 2)
    }

    const first = face.halfEdge;
    let curr = first;

    ctx.save()
    ctx.fillStyle = Color.fromHSL(Math.random(), 0.8, 0.5).toRGBHex()

    ctx.beginPath()
    do
    {
        const next = curr.next;


        const x0 = 0|(cx + curr.vertex.x)
        const y0 = 0|(cy + curr.vertex.y)
        const x1 = 0|(cx + next.vertex.x)
        const y1 = 0|(cy + next.vertex.y)

        if (curr === first)
        {
            ctx.moveTo(x0, y0)
        }
        ctx.lineTo(x1, y1)

        curr = next
    }  while (curr !== first)
    ctx.stroke()
    ctx.restore()

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
                const twinCentroid = twin.face.centroid

                const [ x0, y0 ] = faceCentroid;
                const [ x1, y1 ] = twinCentroid;

                drawArrow(x2, y2, x0, y0);
                //drawArrow(x2, y2, x1, y1);

            }

        }

        curr = next
    }  while (curr !== first)

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

            blipPower = 9 + Math.random() * 5 
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


            let count = 300;

            const flowers = new Map()
            const colors = new Map()

            const neighboringFace = (startEdge) => startEdge.twin && startEdge.twin.face

            const randomFlower = faces => {

                const index = 0 | Math.random() * faces.length;
                const central = faces[index];

                flowers.set(central, index)

                let curr = central.halfEdge
                for (let i=0; i < 4; i++)
                {
                    const nf = neighboringFace(curr)
                    if (nf)
                    {
                        flowers.set(nf, -1 - index)
                    }

                    curr = curr.next
                }
            };

            for (let i=0; i < count; i++)
            {
                randomFlower(faces)
            }

            const getColor = index => {
                const entry = colors.get(index);
                if (!entry)
                {
                    const newEntry = {
                        center: palette[0|Math.random() * palette.length],
                        petals: palette[0|Math.random() * palette.length],
                    };

                    colors.set(index, newEntry)
                    return newEntry

                }
                return entry;
            }

            console.log("FLOWERS", flowers)

            faces.forEach(face => {

                const index = flowers.get(face);

                if (index !== undefined)
                {
                    if(index >= 0)
                    {
                        const { center } = getColor(index)

                        ctx.fillStyle = center;
                    }
                    else
                    {
                        const { petals } = getColor(-(index + 1))
                        ctx.fillStyle = petals;
                    }
                    ctx.beginPath()

                    let curr = face.halfEdge;

                    const { x, y } = curr.vertex
                    ctx.moveTo(cx + x, cy + y);
                    curr = curr.next
                    while(curr !== face.halfEdge)
                    {
                        const { x, y } = curr.vertex
                        ctx.lineTo(cx + x, cy + y);
                        curr = curr.next
                    }
                    ctx.fill();
                }

            })


        };

        paint();

        window.addEventListener("click", paint, true)


    }
);




export default {}

