
export default function weightedRandom(choices)
{
    let origSum = 0;

    for (let i = 0; i < choices.length; i += 2)
    {
        const weight = choices[i]
        origSum += weight;
    }

    return (args, multiplier) => {

        let sum = 0;
        if (multiplier)
        {
            for (let i = 0; i < choices.length; i += 2)
            {
                const weight = multiplier ? choices[i] * multiplier[i >> 1] : choices[i];
                sum += weight;
            }
        }
        else
        {
            sum = origSum
        }


        let val = Math.random() * sum;

        const length = choices.length - 2;
        let i;
        for (i = 0; i < length; i += 2)
        {
            const weight = choices[i    ] * (multiplier ? multiplier[i >> 1] : 1);
            const fn = choices[i + 1];

            val -= weight;
            if (val < 0)
            {
                return fn(... args)
            }
        }

        const fn = choices[i + 1];
        return fn(... args)
    }
}
