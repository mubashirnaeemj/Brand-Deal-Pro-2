import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PitchDraftEditor from "@/components/PitchDraftEditor";
import { api, type ApiPitch } from "@/lib/api";

const pitch: ApiPitch = {
  id: 43, brand_id: 7, brand_name: "Example Brand", is_custom: false,
  story: "A real story", product_reference: null, past_brand_partnership: null,
  content_link: null, contact_name: null, contact_email: null,
  pitch_text: "Subject: Original\n\nOriginal email", status: "generated",
  source: "generated", is_manual: false, sent_at: null, agreed_rate: null,
  created_at: "2026-10-20T10:00:00Z",
};

function mount(disabled = false) {
  const onSaved = vi.fn();
  const onSavingChange = vi.fn();
  const onDirtyChange = vi.fn();
  render(<PitchDraftEditor pitch={pitch} disabled={disabled} onSaved={onSaved}
    onSavingChange={onSavingChange} onDirtyChange={onDirtyChange} />);
  return { onSaved, onSavingChange, onDirtyChange };
}
const editor = () => screen.getByRole("textbox", { name: "Pitch email draft" });
const save = () => screen.getByRole("button", { name: "Save changes" });

describe("pitch review and save", () => {
  it("shows the generated draft and disables saving until something changes", () => {
    const patch = vi.spyOn(api, "patch");
    const { onSaved } = mount();
    expect(editor()).toHaveValue(pitch.pitch_text);
    expect(patch).not.toHaveBeenCalled();
    expect(save()).toBeDisabled();
    fireEvent.click(save());
    expect(onSaved).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
  });

  it("saves exact edited text to the same row without modifying status or sent date", async () => {
    const text = "Subject: Edited\n\nMy reviewed email.\n";
    const updated = { ...pitch, pitch_text: text };
    const patch = vi.spyOn(api, "patch").mockResolvedValue(updated);
    const { onSaved, onDirtyChange } = mount();
    fireEvent.change(editor(), { target: { value: text } });
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(save());
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(updated));
    expect(patch).toHaveBeenCalledExactlyOnceWith("/pitches/43", { pitch_text: text });
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole("status")).toHaveTextContent("Your changes were saved.");
    expect(save()).toBeDisabled();
    fireEvent.change(editor(), { target: { value: text + " More edits." } });
    expect(save()).toBeEnabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("keeps edited text after a failed save and retries the same pitch", async () => {
    const text = "My edits must survive";
    const patch = vi.spyOn(api, "patch").mockRejectedValueOnce(new Error("Connection lost"))
      .mockResolvedValueOnce({ ...pitch, pitch_text: text });
    const { onSaved } = mount();
    fireEvent.change(editor(), { target: { value: text } });
    fireEvent.click(save());
    expect(await screen.findByRole("alert")).toHaveTextContent("Connection lost");
    expect(editor()).toHaveValue(text);
    expect(onSaved).not.toHaveBeenCalled();
    fireEvent.click(save());
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(patch).toHaveBeenCalledTimes(2);
    expect(patch).toHaveBeenLastCalledWith("/pitches/43", { pitch_text: text });
  });

  it("does not report success if the backend ignores edited text", async () => {
    vi.spyOn(api, "patch").mockResolvedValue(pitch);
    const { onSaved } = mount();
    fireEvent.change(editor(), { target: { value: "New email" } });
    fireEvent.click(save());
    expect(await screen.findByRole("alert")).toHaveTextContent("did not confirm");
    expect(onSaved).not.toHaveBeenCalled();
    expect(editor()).toHaveValue("New email");
  });

  it("rejects empty and oversized drafts", () => {
    const patch = vi.spyOn(api, "patch");
    mount();
    fireEvent.change(editor(), { target: { value: "   \n" } });
    expect(save()).toBeDisabled();
    fireEvent.change(editor(), { target: { value: "x".repeat(20001) } });
    expect(save()).toBeDisabled();
    expect(patch).not.toHaveBeenCalled();
  });

  it("blocks repeat saves and editing while a request is pending", async () => {
    let finish!: (value: ApiPitch) => void;
    const patch = vi.spyOn(api, "patch").mockReturnValue(new Promise<ApiPitch>((resolve) => { finish = resolve; }));
    const { onSaved, onSavingChange } = mount();
    fireEvent.change(editor(), { target: { value: "Edited email" } });
    fireEvent.click(save());
    const pending = screen.getByRole("button", { name: "Saving…" });
    expect(pending).toBeDisabled();
    expect(editor()).toBeDisabled();
    fireEvent.click(pending);
    expect(patch).toHaveBeenCalledOnce();
    expect(onSavingChange).toHaveBeenLastCalledWith(true);
    finish({ ...pitch, pitch_text: "Edited email" });
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(onSavingChange).toHaveBeenLastCalledWith(false);
  });

  it("disables the editor while another generation is running", () => {
    const patch = vi.spyOn(api, "patch");
    mount(true);
    expect(editor()).toBeDisabled();
    expect(save()).toBeDisabled();
    expect(patch).not.toHaveBeenCalled();
  });

  it("allows writing an email when generation returns no text", async () => {
    const onSaved = vi.fn();
    vi.spyOn(api, "patch").mockResolvedValue({ ...pitch, pitch_text: "Manually reviewed email" });
    render(<PitchDraftEditor pitch={{ ...pitch, pitch_text: null }} onSaved={onSaved}
      onSavingChange={vi.fn()} onDirtyChange={vi.fn()} />);
    expect(editor()).toHaveValue("");
    expect(save()).toBeDisabled();
    fireEvent.change(editor(), { target: { value: "Manually reviewed email" } });
    fireEvent.click(save());
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  });
});
