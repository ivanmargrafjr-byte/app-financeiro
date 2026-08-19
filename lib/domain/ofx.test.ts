import { describe, expect, it } from "vitest"

import { decodeOfxBytes, parseOfx, parseOfxAmountCents, parseOfxDate } from "./ofx"

/** OFX 1.x — the SGML dialect, with unclosed tags, as Itaú/Bradesco export it. */
const OFX_1 = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20260813120000[-3:BRT]
<LANGUAGE>POR
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>341
<ACCTID>12345-6
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260801000000[-3:BRT]
<DTEND>20260813000000[-3:BRT]
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260803120000[-3:BRT]
<TRNAMT>-129.50
<FITID>202608030001
<MEMO>COMPRA CARTAO CARREFOUR
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260805120000[-3:BRT]
<TRNAMT>16300.00
<FITID>202608050002
<MEMO>SALARIO
</STMTTRN>
<STMTTRN>
<TRNTYPE>XFER
<DTPOSTED>20260810120000[-3:BRT]
<TRNAMT>-250.00
<FITID>202608100003
<NAME>PIX ENVIADO
<MEMO>PIX ENVIADO JOAO &amp; MARIA
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>15920.50
<DTASOF>20260813120000[-3:BRT]
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`

/** OFX 2.x — the XML dialect, with every tag closed. */
const OFX_2 = `<?xml version="1.0" encoding="UTF-8"?>
<?OFX OFXHEADER="200" VERSION="211" SECURITY="NONE" OLDFILEUID="NONE" NEWFILEUID="NONE"?>
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKACCTFROM>
          <BANKID>260</BANKID>
          <ACCTID>987654</ACCTID>
        </BANKACCTFROM>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20260807</DTPOSTED>
            <TRNAMT>-89.90</TRNAMT>
            <FITID>abc-123</FITID>
            <MEMO>Farmácia São João</MEMO>
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`

describe("parseOfx", () => {
  it("reads every movement of an OFX 1.x (SGML) statement", () => {
    const statement = parseOfx(OFX_1)

    expect(statement.transactions).toHaveLength(3)
    expect(statement.transactions[0]).toEqual({
      fitId: "202608030001",
      date: "2026-08-03",
      amountCents: -12950,
      description: "COMPRA CARTAO CARREFOUR",
      type: "DEBIT",
    })
  })

  it("reads the XML dialect the same way", () => {
    const statement = parseOfx(OFX_2)

    expect(statement.transactions).toEqual([
      {
        fitId: "abc-123",
        date: "2026-08-07",
        amountCents: -8990,
        description: "Farmácia São João",
        type: "DEBIT",
      },
    ])
  })

  it("keeps credits positive and debits negative, as the bank reports them", () => {
    const [debit, credit] = parseOfx(OFX_1).transactions

    expect(debit.amountCents).toBeLessThan(0)
    expect(credit.amountCents).toBe(1630000)
  })

  it("prefers MEMO over NAME, since it is the description a person recognises", () => {
    const pix = parseOfx(OFX_1).transactions[2]

    expect(pix.description).toBe("PIX ENVIADO JOAO & MARIA")
  })

  it("falls back to NAME when the bank sends no MEMO", () => {
    const statement = parseOfx(
      OFX_1.replace("<NAME>PIX ENVIADO\n<MEMO>PIX ENVIADO JOAO &amp; MARIA", "<NAME>PIX ENVIADO")
    )

    expect(statement.transactions[2].description).toBe("PIX ENVIADO")
  })

  it("reads the account and closing balance the file reports", () => {
    const statement = parseOfx(OFX_1)

    expect(statement.bankId).toBe("341")
    expect(statement.accountId).toBe("12345-6")
    expect(statement.ledgerBalanceCents).toBe(1592050)
    expect(statement.ledgerBalanceDate).toBe("2026-08-13")
  })

  it("drops a movement with no FITID instead of importing something it cannot dedup", () => {
    const statement = parseOfx(OFX_1.replace("<FITID>202608030001\n", ""))

    expect(statement.transactions).toHaveLength(2)
    expect(statement.transactions.map((t) => t.fitId)).toEqual(["202608050002", "202608100003"])
  })

  it("drops a movement whose amount cannot be read, rather than guessing a value", () => {
    const statement = parseOfx(OFX_1.replace("<TRNAMT>-129.50", "<TRNAMT>indisponivel"))

    expect(statement.transactions).toHaveLength(2)
  })

  it("rejects a file that isn't an OFX at all", () => {
    expect(() => parseOfx("data,valor\n2026-08-01,10")).toThrow(/não parece ser um extrato OFX/)
  })

  it("returns an empty statement for an OFX with no movements", () => {
    expect(parseOfx("<OFX><BANKMSGSRSV1></BANKMSGSRSV1></OFX>").transactions).toEqual([])
  })
})

describe("parseOfxDate", () => {
  it("keeps the bank's calendar day, dropping the time and zone", () => {
    // 21:00 in Brasília is already the next day in UTC — converting would shift it.
    expect(parseOfxDate("20260803210000[-3:BRT]")).toBe("2026-08-03")
  })

  it("accepts a date with no time at all", () => {
    expect(parseOfxDate("20260803")).toBe("2026-08-03")
  })

  it("rejects a malformed date", () => {
    expect(parseOfxDate("2026-08-03")).toBeNull()
    expect(parseOfxDate("20261303")).toBeNull()
    expect(parseOfxDate("")).toBeNull()
  })
})

describe("parseOfxAmountCents", () => {
  it("reads the dot the spec prescribes", () => {
    expect(parseOfxAmountCents("-129.50")).toBe(-12950)
    expect(parseOfxAmountCents("16300.00")).toBe(1630000)
  })

  it("reads the comma some exports use anyway", () => {
    expect(parseOfxAmountCents("-129,50")).toBe(-12950)
  })

  it("reads an amount with thousands separators", () => {
    expect(parseOfxAmountCents("1.234,56")).toBe(123456)
  })

  it("does not lose a cent to floating point", () => {
    // Number("19.99") * 100 is 1998.9999999999998 — the reason this goes via strings.
    expect(parseOfxAmountCents("19.99")).toBe(1999)
    expect(parseOfxAmountCents("-1234.35")).toBe(-123435)
  })

  it("handles an amount with no decimals and a leading plus", () => {
    expect(parseOfxAmountCents("+250")).toBe(25000)
  })

  it("returns null for something that isn't a number", () => {
    expect(parseOfxAmountCents("indisponivel")).toBeNull()
    expect(parseOfxAmountCents("")).toBeNull()
  })
})

describe("decodeOfxBytes", () => {
  it("decodes windows-1252, the charset OFX 1.x exports declare", () => {
    // "Farmácia" with the 1252 byte 0xE1 for á — as UTF-8 it would be a replacement char.
    const bytes = new Uint8Array([
      ...new TextEncoder().encode("OFXHEADER:100\nCHARSET:1252\n<OFX><MEMO>Farm"),
      0xe1,
      ...new TextEncoder().encode("cia</MEMO></OFX>"),
    ])

    expect(decodeOfxBytes(bytes.buffer)).toContain("Farmácia")
  })

  it("decodes UTF-8 when the file declares it", () => {
    const bytes = new TextEncoder().encode(
      '<?xml version="1.0" encoding="UTF-8"?>\n<OFX><MEMO>Farmácia</MEMO></OFX>'
    )

    expect(decodeOfxBytes(bytes.buffer as ArrayBuffer)).toContain("Farmácia")
  })
})
