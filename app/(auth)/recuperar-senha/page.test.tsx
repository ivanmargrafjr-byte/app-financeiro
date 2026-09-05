import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import RecuperarSenhaPage from "./page"

const sendPasswordReset = vi.fn()
const toastError = vi.fn()

vi.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ sendPasswordReset }),
}))

vi.mock("sonner", () => ({
  toast: { error: (message: string) => toastError(message) },
}))

/**
 * jsdom does not submit a form when its submit button is clicked, so the event is
 * dispatched on the form itself — same handler the button reaches in a browser.
 */
function submit(container: HTMLElement, email: string) {
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: email } })
  fireEvent.submit(container.querySelector("form")!)
}

describe("RecuperarSenhaPage", () => {
  beforeEach(() => {
    sendPasswordReset.mockReset()
    toastError.mockReset()
  })

  it("confirms the send without repeating the address back as a fact", async () => {
    sendPasswordReset.mockResolvedValue(undefined)
    const { container } = render(<RecuperarSenhaPage />)

    submit(container, "ivan@margraf.tec.br")

    expect(await screen.findByText(/Se existir uma conta com ivan@margraf.tec.br/)).toBeTruthy()
    expect(sendPasswordReset).toHaveBeenCalledWith("ivan@margraf.tec.br")
  })

  it("answers the same way for an address with no account", async () => {
    sendPasswordReset.mockRejectedValue({ code: "auth/user-not-found" })
    const { container } = render(<RecuperarSenhaPage />)

    submit(container, "ninguem@exemplo.com")

    expect(await screen.findByText(/Se existir uma conta com ninguem@exemplo.com/)).toBeTruthy()
    expect(toastError).not.toHaveBeenCalled()
  })

  it("surfaces a real failure instead of pretending the e-mail went out", async () => {
    sendPasswordReset.mockRejectedValue({ code: "auth/network-request-failed" })
    const { container } = render(<RecuperarSenhaPage />)

    submit(container, "ivan@margraf.tec.br")

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Falha de conexão. Verifique sua internet.")
    )
    expect(screen.queryByText(/Se existir uma conta/)).toBeNull()
  })

  it("does not send while the address is malformed", async () => {
    const { container } = render(<RecuperarSenhaPage />)

    submit(container, "nao-e-email")

    expect(await screen.findByText("E-mail inválido")).toBeTruthy()
    expect(sendPasswordReset).not.toHaveBeenCalled()
  })
})
