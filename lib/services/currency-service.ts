type ExchangeRateResponse = {
  result?: string
  base_code?: string
  target_code?: string
  conversion_rate?: number
}

export async function convertCurrency(input: {
  amount: number
  from: string
  to: string
}) {
  const amount = Number(input.amount)
  const from = input.from.trim().toUpperCase()
  const to = input.to.trim().toUpperCase()
  

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid conversion amount")
  }

  if (!from || !to) {
    throw new Error(
      "Source and target currencies are required",
    )
  }

  /*
   * Same currency.
   * No external request is necessary.
   */
  if (from === to) {
    return {
      amount: Number(amount.toFixed(2)),
      rate: 1,
      from,
      to,
    }
  }

  try {
    const url =
      `https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    })

    const rawText = await response.text()

    if (!response.ok) {
      console.error(
        "EXCHANGE RATE HTTP ERROR",
        {
          status: response.status,
          body: rawText,
        },
      )

      throw new Error(
        `Exchange-rate API returned HTTP ${response.status}`,
      )
    }

    let data: {
      result?: string
      base_code?: string
      rates?: Record<string, number>
    }

    try {
      data = JSON.parse(rawText)
    } catch {
      console.error(
        "EXCHANGE RATE INVALID JSON",
        rawText,
      )

      throw new Error(
        "Exchange-rate API returned invalid JSON",
      )
    }

    /*
     * Check API-level failure.
     */
    if (data.result !== "success") {
      console.error(
        "EXCHANGE RATE API ERROR",
        data,
      )

      throw new Error(
        "Exchange-rate provider returned an unsuccessful response",
      )
    }

    /*
     * The API returns rates for the
     * currencies available from the source currency.
     */
    if (
      !data.rates ||
      typeof data.rates !== "object"
    ) {
      console.error(
        "EXCHANGE RATE RESPONSE MISSING RATES",
        data,
      )

      throw new Error(
        `No exchange rates returned for ${from}`,
      )
    }

    const rate = Number(data.rates[to])

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error(
        `Exchange rate unavailable for ${from} → ${to}`,
      )
    }

    const convertedAmount = Number(
      (amount * rate).toFixed(2),
    )

    console.log(
      "CURRENCY CONVERSION",
      {
        amount,
        from,
        to,
        rate,
        convertedAmount,
      },
    )

    return {
      amount: convertedAmount,
      rate,
      from,
      to,
    }
  } catch (error) {
    console.error(
      "CURRENCY CONVERSION ERROR",
      {
        amount,
        from,
        to,
        error,
      },
    )

    throw error instanceof Error
      ? error
      : new Error(
          "Currency conversion failed",
        )
  }
}