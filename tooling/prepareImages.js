const fs = require("fs")
const path = require("path")
const Jimp = require("jimp");

const imageNames= [
    "../media-src/eyes-1.png",
    "../media-src/eyes-2.png",
    "../media-src/eyes-3.png",
    "../media-src/eyes-4.png",
    "../media-src/eyes-5.png",
    "../media-src/eyes-6.png",
    "../media-src/eyes-7.png",
    "../media-src/eyes-8.png",
    "../media-src/eyes-9.png",
    "../media-src/mouth-1.png",
    "../media-src/mouth-2.png",
    "../media-src/mouth-3.png",
    "../media-src/mouth-4.png",
    "../media-src/mouth-5.png",
    "../media-src/mouth-6.png",
    "../media-src/mouth-7.png",
    "../media-src/mouth-8.png",
    "../media-src/mouth-9.png",
    "../media-src/nose-1.png",
    "../media-src/nose-2.png",
    "../media-src/nose-3.png",
    "../media-src/nose-4.png",
    "../media-src/nose-5.png",
    "../media-src/nose-6.png",
    "../media-src/nose-7.png",
    "../media-src/nose-8.png",
    "../media-src/nose-9.png"
]

function AABB()
{
    this.minX = Infinity;
    this.minY = Infinity;
    this.maxX = -Infinity;
    this.maxY = -Infinity;
}

AABB.prototype.add = function (x,y)
{
    if (x instanceof AABB)
    {
        this.add(x.minX,x.minY)
        this.add(x.maxX,x.maxY)
    }
    else
    {
        this.minX = Math.min(this.minX, x);
        this.minY = Math.min(this.minY, y);
        this.maxX = Math.max(this.maxX, x);
        this.maxY = Math.max(this.maxY, y);
    }
}


AABB.prototype.getWidth = function()
{
    return (this.maxX - this.minX) | 0;
}

AABB.prototype.getHeight = function()
{
    return (this.maxY - this.minY) | 0;
}

AABB.prototype.getCenter = function()
{
    return [(this.minX + this.maxX)/2, (this.minY + this.maxY)/2 ]
}

AABB.prototype.grow = function(n)
{
    this.minX -= n;
    this.minY -= n;
    this.maxY += n;
    this.maxY += n;
}

Promise.all(imageNames.map(name => Jimp.read(path.join(__dirname, name))))
    .then(
        images => {

            const atlas = []

            let px = 0
            let py = 0

            const getAABB = (images) =>
            {
                const groupAABB = new AABB();

                for (let i = 0; i < images.length; i++)
                {
                    const aabb = new AABB()
                    const { bitmap } = images[i];
                    const { width, height, data } = bitmap
                    let off = 0
                    for (let y = 0; y < height; y++)
                    {
                        for (let x = 0; x < width; x++)
                        {
                            if (data[off + 3] > 0)
                            {
                                aabb.add(x,y)
                            }
                            off += 4
                        }
                    }

                    aabb.grow(1)

                    let w = aabb.getWidth();
                    let h = aabb.getHeight();
                    atlas.push({
                        index: atlas.length,
                        x: px,
                        y: py,
                        w,
                        h,
                        ox: aabb.minX,
                        oy: aabb.minY,
                    })

                    px += w

                    groupAABB.add(aabb)
                }

                return [groupAABB, px]
            }

            const aabb = new AABB()

            const [eyesAABB, eyesWidth] = getAABB(images.slice(0,9))
            px = 0
            py += eyesAABB.getHeight()

            const [mouthAABB, mouthWidth] = getAABB(images.slice(9,18))

            px = 0
            py += mouthAABB.getHeight()

            const [ noseAABB, noseWidth ] = getAABB(images.slice(18))

            px = 0
            py += noseAABB.getHeight()
            
            aabb.add(eyesAABB)
            aabb.add(mouthAABB)
            aabb.add(noseAABB)

            const sheetWidth = Math.max(eyesWidth, mouthWidth, noseWidth);

            console.log("SHEET: " +  sheetWidth + ", "  + py )

            return Jimp.create( sheetWidth, py, 0)
                .then(
                    sheet => {
                        for (let i = 0; i < atlas.length; i++)
                        {
                            const {x : srcX, y : srcY, w, h, ox, oy} = atlas[i];

                            const { bitmap : srcBitmap } = images[i]
                            const { bitmap : dstBitmap } = sheet

                            const { data : src, width : srcWidth } = srcBitmap
                            const { data : dst, width: dstWidth } = dstBitmap

                            const offX = srcX - ox
                            const offY = srcY - oy

                            for (let y = oy; y < oy + h; y++)
                            {
                                for (let x = ox; x < ox + w; x++)
                                {
                                    const srcOff = (y * srcWidth + x) * 4
                                    const dstOff = ((y + offY) * dstWidth + (x + offX)) * 4

                                    dst[dstOff    ] = src[srcOff    ]
                                    dst[dstOff + 1] = src[srcOff + 1]
                                    dst[dstOff + 2] = src[srcOff + 2]
                                    dst[dstOff + 3] = src[srcOff + 3]
                                }
                            }
                        }

                        fs.writeFileSync(path.join(__dirname, "../src/atlas.json"), JSON.stringify(atlas), "utf-8")

                        return sheet.writeAsync(path.join(__dirname, "../media/sheet.png"))
                    }
                )
        }
    )

