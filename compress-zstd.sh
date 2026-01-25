#!/usr/bin/env bash
set -euo pipefail

base_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
target_dir="${1:-"$base_dir"}"
parallelism="${PARALLELISM:-10}"

if [[ ! -d "$target_dir" ]]; then
  echo "Target directory not found: $target_dir" >&2
  exit 1
fi

if ! command -v zstd >/dev/null 2>&1; then
  echo "Missing dependency: zstd (install it first)." >&2
  exit 1
fi

shopt -s nullglob
dirs=("$target_dir"/*/)
shopt -u nullglob

if (( ${#dirs[@]} == 0 )); then
  echo "No directories found in: $target_dir"
  exit 0
fi

compress_dir() {
  local dir="$1"
  local name out
  name="$(basename "$dir")"
  out="${target_dir}/${name}.tar.zst"
  echo "Compressing ${name} -> ${out}"
  tar -C "$target_dir" -cf - "$name" | zstd -9 -T0 -o "$out"
}

export -f compress_dir
export target_dir

printf '%s\0' "${dirs[@]}" | xargs -0 -n 1 -P "$parallelism" bash -c 'set -euo pipefail; compress_dir "$1"' _

echo "Done."
