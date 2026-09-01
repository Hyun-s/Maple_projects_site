# Why longer textual-inversion training did not recover item identity

## Empirical finding

The four fixed qualitative probes provide no visual evidence that extending optimization from
3,000 to 90,000 steps recovers the target equipment identities. Both the exact training-caption
condition and the anime-style transfer condition remain dominated by unrelated figures, symbols,
or nearly empty outputs. This is a negative result, not a successful inversion trajectory.

## Measured evidence

- The mean loss in the first 3,000-step block was 0.151168; the mean after
  18,000 steps was 0.116803. The objective improves early and then plateaus.
- From 3,000 to 90,000 steps, the mean relative CLIP-L token drift reached
  104.22%, whereas the T5 token drift reached only
  0.0579%.
- The median sprite occupies 2.73% of the 256×256
  canvas as non-white pixels. Most pixels therefore describe the background rather than equipment.

## Mechanistic interpretation

1. **Insufficient adaptation capacity (high confidence).** Only 30 token rows are updated while the
   FLUX transformer and VAE are frozen. Token embeddings can redirect an existing image prior, but
   they cannot reliably install a missing tiny-sprite rendering prior by themselves.
2. **Foreground-to-background imbalance (high confidence).** Whole-image flow-matching loss is
   dominated by the white canvas. A lower loss therefore need not correspond to improved garment
   geometry or color.
3. **Entangled multi-item supervision (high confidence).** Every image contains a hat, top, and
   bottom simultaneously, without item masks or isolated examples. The objective does not identify
   which spatial evidence should be assigned to which token.
4. **Unequal text-encoder optimization (medium-to-high confidence).** CLIP-L moves substantially,
   while T5 remains almost fixed in relative terms. Training full BF16 embedding matrices with the
   same learning rate is a plausible numerical cause, but this run did not log per-encoder gradient
   and update norms; the cause remains a hypothesis rather than a proven mechanism.
5. **Over-optimization after the useful regime (medium confidence).** Constant-rate training keeps
   moving CLIP-L after the loss has plateaued, without a visually aligned checkpoint-selection rule.

## Revised experimental program

The next run is deliberately staged. First, a short transformer-LoRA pilot must establish that
FLUX can represent the foreground-normalized Maple sprite domain at all. Only after that gate passes
should per-item identifiers be learned with isolated/category-balanced supervision and FP32 CLIP-L
token parameters. T5 remains frozen. Visual probes are sampled every 250 steps, and training stops
when the exact-caption panel ceases to improve; another 90,000-step sweep is not justified.
