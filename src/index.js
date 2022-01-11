import "./style.css"
import HexagonPatch from "./HexagonPatch";
import atlas from "./atlas.json"
import Color from "./Color";


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


function drawArrow(x0, y0, x1, y1)
{
    const {width, height} = config;

    const cx = width / 2;
    const cy = height / 2;

    const dy = y1 - y0;
    const dx = x1 - x0;

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

    ctx.strokeStyle = "#0f0"
    ctx.beginPath()
    ctx.moveTo(cx + x2, cy + y2)
    ctx.lineTo(cx + x3, cy + y3)

    ctx.moveTo(cx + x3, cy + y3)
    ctx.lineTo(cx + x4 + nx, cy + y4 + ny)
    ctx.moveTo(cx + x3, cy + y3)
    ctx.lineTo(cx + x4 - nx, cy + y4 - ny)
    ctx.stroke()
}


function drawFaceOutline(face, roundness = 1)
{
    const {width, height} = config;

    const cx = width / 2;
    const cy = height / 2;

    const first = face.halfEdge;
    let curr = first;

    ctx.fillStyle = Color.fromHSL(1/12 - 1/24 + Math.random()/24,0.25, 0.3 + Math.random() * 0.4).mix(blue, Math.random() * 0.1).toRGBHex()

    ctx.beginPath()


    const corner = (curr, noMove = false) => {
        const next = curr.next;
        const x0 = 0 | (cx + curr.vertex.x)
        const y0 = 0 | (cy + curr.vertex.y)
        const x1 = 0 | (cx + next.vertex.x)
        const y1 = 0 | (cy + next.vertex.y)
        const x2 = 0 | (cx + next.next.vertex.x)
        const y2 = 0 | (cy + next.next.vertex.y)

        let xm1 = (x0 + x1) / 2;
        let ym1 = (y0 + y1) / 2;
        if (curr === first && !noMove)
        {
            ctx.moveTo(xm1, ym1)
        }
        let xm2 = (x1 + x2) / 2;
        let ym2 = (y1 + y2) / 2;

        const dx1 = x1 - xm1
        const dy1 = y1 - ym1
        const dx2 = xm2 - x1
        const dy2 = ym2 - y1

        const radius = Math.min(
            Math.sqrt(dx1 * dx1 + dy1 * dy1),
            Math.sqrt(dx2 * dx2 + dy2 * dy2)
        ) * roundness

        ctx.arcTo(x1, y1, xm2, ym2, radius)

    };


    do
    {
        corner(curr);
        curr = curr.next
    } while (curr !== first)
    corner(curr, true);
    ctx.fill()
    ctx.stroke()

}

const TEXTURE_SIZE = 256


function topMost(first)
{
    let minX = Infinity
    let minY = Infinity

    let tm;

    let curr = first
    do
    {
        const { x,y } = curr.vertex

        if (y < minY || (y === minY && x < minX))
        {
            minX = x
            minY = y
            tm = curr
        }

        curr = curr.next

    } while (curr !== first)

    return tm;
}

const ORIENTATIONS = [
    [0,1,2,3,4,5,6,7],
    [2,3,4,5,6,7,0,1],
    [4,5,6,7,0,1,2,3],
    [6,7,0,1,2,3,4,5]
]


function startAtTop(verts)
{
    const pts = [0,0,0,0,0,0,0,0];


    let minX = Infinity
    let minY = Infinity
    let top

    for (let i = 0; i < verts.length; i += 2)
    {
        const x = verts[i    ]
        const y = verts[i + 1]

        if (y < minY || (y === minY && x < minX))
        {
            minX = x
            minY = y
            top = i/2
        }

    }

    let off = top
    for (let i = 0; i < 4; i++)
    {
        pts[i*2    ] = verts[off * 2    ]
        pts[i*2 + 1] = verts[off * 2 + 1]

        off = (off + 1) & 3
    }
    return pts;
}


class Cage {

    verts
    orientation;


    constructor(verts, scale = 1, randomize = true, textureSize = 256)
    {
        console.log("VERTS", verts)
        this.verts = startAtTop(verts);
        this.scale = scale
        this.textureSize = textureSize
        this.orientation = ORIENTATIONS[randomize ? 0 | Math.random() * 4 : 0]
    }

    static fromFace(face, scale = 1, randomize = true, textureSize = 256)
    {
        const { width, height } = config

        const verts = new Array(8);

        let curr = face.halfEdge
        let i = 0;
        while(i < 8)
        {
            verts[i++] = width/2 + curr.vertex.x
            verts[i++] = height/2 + curr.vertex.y
            curr = curr.next
        }

        if (curr !== face.halfEdge)
        {
            throw new Error("Face is not a quad")
        }

        return new Cage(verts, scale, randomize, textureSize)

    }

    transform(x,y)
    {
        const { scale, verts } = this

        const [i0,i1,i2,i3,i4,i5,i6,i7] = this.orientation

        const x0 = verts[i0]
        const y0 = verts[i1]
        const x1 = verts[i2]
        const y1 = verts[i3]
        const x2 = verts[i4]
        const y2 = verts[i5]
        const x3 = verts[i6]
        const y3 = verts[i7]

        const v0x = x3 - x0
        const v0y = y3 - y0
        const v1x = x2 - x1
        const v1y = y2 - y1

        // prescaling
        const max = this.textureSize - 1;
        x = 0.5 + ((x/max - 0.5) * scale)
        y = 0.5 + ((y/max - 0.5) * scale)

        const vp0x = x0 + v0x * y
        const vp0y = y0 + v0y * y
        const vp1x = x1 + v1x * y
        const vp1y = y1 + v1y * y

        return [
            Math.round(vp0x + (vp1x - vp0x) * x),
            Math.round(vp0y + (vp1y - vp0y) * x)
        ]
    }

    get center()
    {

        const { verts } = this

        return [
            (verts[0] + verts[2] + verts[4] + verts[6])/4,
            (verts[1] + verts[3] + verts[5] + verts[7])/4,
        ]
    }

}


function drawRandomFace(imageData, cage)
{
    const {data: eyes} = eyeTextures[0|Math.random() * eyeTextures.length];
    const {data: mouth} = mouthTextures[0|Math.random() * mouthTextures.length];
    const {data: nose} = noseTextures[0|Math.random() * noseTextures.length];

    const uvs0 = [
          0,   0,
        255,   0,
        255, 255,
          0, 255,
    ]

    const [i0,i1,i2,i3,i4,i5,i6,i7] = cage.orientation

    const uvs = [
        uvs0[i0],
        uvs0[i1],
        uvs0[i2],
        uvs0[i3],
        uvs0[i4],
        uvs0[i5],
        uvs0[i6],
        uvs0[i7],

    ]


    //console.log("UVS", uvs)

    const { data: dst, width: screenWidth } = imageData;

    const { width, height } = config

    const { verts } = cage
    
    let left = 0, right = 0
    let leftCount = 0, rightCount = 0

    let lx,lu,lv
    let rx,ru,rv

    let ldx,ldu,ldv
    let rdx,rdu,rdv

    const y0 = verts[1];
    const y1 = verts[3];
    if (y0 === y1)
    {
        right = 1
    }

    let yPos = y0;
    do
    {

        if (leftCount === 0)
        {
            const next = (left - 1) & 3;

            lx = verts[left * 2    ]
            lu =   uvs[left * 2    ]
            lv =   uvs[left * 2 + 1]

            const x1 = verts[next*2]
            const y1 = verts[next*2+1]
            const u1 = uvs[next*2]
            const v1 = uvs[next*2 +1]

            const dy = y1 - yPos
            if (dy <= 0)
            {
                break
            }
            ldx = (x1 - lx)/dy
            ldu = (u1 - lu)/dy
            ldv = (v1 - lv)/dy

            left = next
            leftCount = dy

            //console.log("left set to ", left, " at ", yPos)

        }


        if (rightCount === 0)
        {

            const next = (right + 1) & 3;

            rx = verts[right*2    ]
            ru = uvs[right*2    ]
            rv = uvs[right*2 + 1]

            const x1 = verts[next*2]
            const y1 = verts[next*2+1]
            const u1 = uvs[next*2]
            const v1 = uvs[next*2 +1]

            const dy = y1 - yPos
            if (dy <= 0)
            {
                break
            }

            rdx = (x1 - rx)/dy
            rdu = (u1 - ru)/dy
            rdv = (v1 - rv)/dy

            right = next
            rightCount = dy

            //console.log("right set to ", right, " at ", yPos)
        }

        //console.log("line", yPos, {lx,lu,lv}, {rx,ru,rv})

        const dx = rx - lx
        if (dx !== 0)
        {
            const du = (ru - lu)/dx
            const dv = (rv - lv)/dx

            let x = lx
            let u = lu
            let v = lv
            let dstOff = (Math.round(yPos) * screenWidth + Math.round(x)) * 4;
            for (let i=0; i < dx; i++)
            {
                const srcOff = (Math.round(v) * 256 + Math.round(u)) * 4;

                if (x >= 0 && x < width && yPos >=0 && yPos < height)
                {
                    const src = eyes[srcOff + 3] > 0 ? eyes : (mouth[srcOff + 3] > 0 ? mouth : nose)

                    if (src[srcOff + 3] > 0)
                    {
                        dst[dstOff    ] = src[srcOff]
                        dst[dstOff + 1] = src[srcOff + 1]
                        dst[dstOff + 2] = src[srcOff + 2]
                        dst[dstOff + 3] = 255
                    }
                }

                dstOff += 4

                x++;
                u += du
                v += dv
            }
        }
        yPos++

        lx += ldx
        lu += ldu
        lv += ldv

        rx += rdx
        ru += rdu
        rv += rdv

        leftCount--
        rightCount--

    } while (true)
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


function renderDebugCage(cage)
{
    ctx.strokeStyle = "#080"
    ctx.beginPath()
    ctx.moveTo(cage.verts[0], cage.verts[1])
    ctx.lineTo(cage.verts[2], cage.verts[3])
    ctx.lineTo(cage.verts[4], cage.verts[5])
    ctx.lineTo(cage.verts[6], cage.verts[7])
    ctx.lineTo(cage.verts[0], cage.verts[1])
    ctx.stroke()
}


const eyesImages = [
    "eyes-1",
    "eyes-2",
    "eyes-3",
    "eyes-4",
    "eyes-5",
    "eyes-6",
    "eyes-7",
    "eyes-8",
    "eyes-9",
]

const mouthImages = [

    "mouth-1",
    "mouth-2",
    "mouth-3",
    "mouth-4",
    "mouth-5",
    "mouth-6",
    "mouth-7",
    "mouth-8",
    "mouth-9",
]

const noseImages = [

    "nose-1",
    "nose-2",
    "nose-3",
    "nose-4",
    "nose-5",
    "nose-6",
    "nose-7",
    "nose-8",
    "nose-9",
]

function convertToTexture(id)
{
    const textureCanvas = document.createElement("canvas")
    textureCanvas.width = TEXTURE_SIZE
    textureCanvas.height = TEXTURE_SIZE

    /**
     * @type CanvasRenderingContext2D
     */
    const textureCtx = textureCanvas.getContext("2d");

    textureCtx.drawImage(document.getElementById(id),0,0)

    return textureCtx.getImageData(0,0, TEXTURE_SIZE, TEXTURE_SIZE)
}

let eyeTextures, mouthTextures, noseTextures

window.onload = (
    () => {

        eyeTextures = eyesImages.map(convertToTexture)
        mouthTextures = mouthImages.map(convertToTexture)
        noseTextures = noseImages.map(convertToTexture)

        canvas = document.getElementById("screen");
        ctx = canvas.getContext("2d");

        const width = (window.innerWidth) | 0;
        const height = (window.innerHeight) | 0;

        config.width = width;
        config.height = height;

        canvas.width = width;
        canvas.height = height;

        const paint = () => {

            let gradient = ctx.createLinearGradient(0,0,0,height);
            gradient.addColorStop(0, "#a69d93")
            gradient.addColorStop(1, "#3a5f7a")
            ctx.fillStyle = gradient
            ctx.fillRect(0, 0, width, height)

            const patch = new HexagonPatch(0, 0, width/12)

            let faces = patch.build();

            console.log("FACES", faces.length, faces.map(f => f.length))

            const cx = width / 2
            const cy = height / 2

            ctx.strokeStyle = "#000"
            ctx.lineWidth = 2
            ctx.fillStyle = "rgba(255,255,255, 0.66)"

            //faces = [ faces.find(inScreen) ]

            faces.forEach(face => {
                drawFaceOutline(face, 0.65)
            })

            const imageData = ctx.getImageData(0,0, width, height)

            faces.forEach(face => {
                const cage = Cage.fromFace(face)
                drawRandomFace(imageData, cage)
            })

            // let angle = Math.random() * TAU
            //
            // const px = Math.random() * width;
            // const py = Math.random() * height;
            //
            // const pts = []
            // for (let i=0; i < 4; i++)
            // {
            //     const radius = Math.min(width,height)/4 * (0.5 + Math.random() * 0.5)
            //     pts.push(
            //         Math.round(px + Math.cos(angle) * radius),
            //         Math.round(py + Math.sin(angle) * radius)
            //     )
            //
            //     angle += TAU/4
            // }
            // console.log("CAGE", pts)
            //
            // const cage = new Cage(pts, 1);

            // const cage = new Cage([
            //     100,100,
            //     380,120,
            //     400,400,
            //     100,400,
            // ].map(n => n - 100), 1, false);
            //drawRandomFace(imageData, cage)
            ctx.putImageData(imageData, 0, 0)
            //renderDebugCage(cage)
        };

        paint();

        window.addEventListener("click", paint, true)


    }
);




export default {}

