"use client";
/**
 * MUI-backed form controls for the Template Builder editor body.
 *
 * These replace raw `<input style={inputBase}>` / `<textarea>` elements. The
 * visual result is deliberately close to what was there — this is not a
 * restyle, it is a swap of the underlying control so three things stop being
 * per-call-site decisions:
 *
 *   - the 44px tap floor (the old inputs computed to ~34px: 13px text plus
 *     8px padding either side, comfortable with a mouse, a mis-tap with a
 *     thumb),
 *   - focus rings and disabled states, which the inline styles never defined
 *     beyond `outline: none`,
 *   - the label/control association, which `Field`'s bare <label> never made.
 *
 * The uppercase field label stays outside the control (see `Field`), so these
 * take no MUI `label` prop — two labels would stack.
 */
import TextField from "@mui/material/TextField";
import type { TextFieldProps } from "@mui/material/TextField";

/** Height floor for a single-line control. Multiline grows past it. */
const TAP_MIN = 44;

const sharedSx = {
  "& .MuiOutlinedInput-root": {
    background: "var(--bg)",
    fontSize: 13,
    borderRadius: "6px",
  },
  "& .MuiOutlinedInput-input": {
    paddingTop: "10px",
    paddingBottom: "10px",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--border)",
    borderWidth: "1.5px",
  },
} as const;

export function TBInput(props: TextFieldProps) {
  return (
    <TextField
      fullWidth
      size="small"
      {...props}
      sx={{
        ...sharedSx,
        "& .MuiOutlinedInput-root": { ...sharedSx["& .MuiOutlinedInput-root"], minHeight: TAP_MIN },
        ...props.sx,
      }}
    />
  );
}

/**
 * Select with the same metrics as TBInput. MUI renders its options as
 * MenuItem, not <option>, so call sites pass MenuItem children.
 */
export function TBSelect(props: TextFieldProps) {
  return (
    <TextField
      fullWidth
      size="small"
      select
      {...props}
      sx={{
        ...sharedSx,
        "& .MuiOutlinedInput-root": { ...sharedSx["& .MuiOutlinedInput-root"], minHeight: TAP_MIN },
        ...props.sx,
      }}
    />
  );
}

export function TBTextarea({ minRows = 3, ...props }: TextFieldProps & { minRows?: number }) {
  return (
    <TextField
      fullWidth
      size="small"
      multiline
      minRows={minRows}
      {...props}
      sx={{
        ...sharedSx,
        "& .MuiOutlinedInput-root": { ...sharedSx["& .MuiOutlinedInput-root"], padding: "8px 11px" },
        "& .MuiOutlinedInput-input": { lineHeight: 1.5 },
        ...props.sx,
      }}
    />
  );
}
