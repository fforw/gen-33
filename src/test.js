import "./style.css"
import { orient2d } from "robust-predicates"
import { canvasRGB } from "stackblur-canvas"
import { polygonContains } from "d3-polygon"
import HexagonPatch from "./HexagonPatch";
import Color from "./Color";
import randomPalette from "./randomPalette";
import AABB from "./AABB";
import { easeInOutCubic } from "./easing";


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

let mouseX = 10
let mouseY = 10
let startX = 10
let startY = 10


let endX = 400
let endY = 200

let midX = (endX + startX)/2
let midY = (endY + startY)/3


function helpText()
{
    const {width, height } = config

    ctx.font = "20px sans-serif"
    ctx.fillStyle = "rgba(0,255,0,0.7)"
    const text = "Press 'a' to set start, 'b' to set end, click to set middle";
    const tm = ctx.measureText(text)
    ctx.fillText(text, width/2 - tm.width/2, 24)
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

        const cx = width/2;
        const cy = height/2;


        const paint = () => {

            ctx.fillStyle = "#16161d"
            ctx.fillRect(0,0,width,height)

            ctx.strokeStyle = "#f0f"
            ctx.beginPath()
            ctx.moveTo(startX, startY)

            const xm = (startX + endX)/2
            const ym = (startY + endY)/2
            const dx = midX - xm
            const dy = midY - ym

            ctx.quadraticCurveTo(xm + dx * 2, ym + dy * 2, endX, endY)
            ctx.stroke()
            
            ctx.fillStyle = "#0f0"
            ctx.fillRect(startX - 2,startY - 2,4,4)
            ctx.fillRect(midX - 2,midY - 2,4,4)
            ctx.fillRect(endX - 2,endY - 2,4,4)
            helpText();

        }

        paint()

        canvas.addEventListener("click", () => {
            midX = mouseX
            midY = mouseY
            paint()


        }, true)

        canvas.addEventListener("mousemove", ev => {

            const rect = canvas.getBoundingClientRect();

            mouseX = ev.clientX - rect.x
            mouseY = ev.clientY - rect.y

        }, true)
        window.addEventListener("keydown", ev => {

            const rect = canvas.getBoundingClientRect();

            if (ev.key === "a")
            {
                startX = mouseX
                startY = mouseY

                paint()
            }
            else if (ev.key === "b")
            {
                endX = mouseX
                endY = mouseY
                paint()
            }

        }, true)


    }
);




export default {}

