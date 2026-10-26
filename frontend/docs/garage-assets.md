# Garage model lookup

The showroom reads a vehicle’s make, model, year, variant, and body style and resolves them against the local catalogue in `src/features/garage/vehicleCatalogue.ts`. Saving a vehicle does not require a 3D file. Bookings and service records stay attached to the vehicle id, not to the visual asset.

## What is published now

One realistic model is stored in this project:

- File: `public/models/car-concept.glb`
- Thumbnail: `public/models/car-concept-thumb.jpg`
- Source: [Khronos glTF Sample Assets, Car Concept](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept)
- Author: Eric Chadwick, Darmstadt Graphics Group GmbH
- Licence: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/legalcode)
- Earlier model: public-domain concept car by Unity Fan
- Body paint materials: `Paint 1 Carmine`, `Paint 2 Carmine`, and the Pearl and Graphite variants of those names

The file is the official glTF binary sample (about 11 MB). It is lazy-loaded only when the showroom draws it. It is a concept car. The catalogue marks it as an exact match only for Demonstration Concept Car, 2024, show car. Years 2020–2023 of that same demonstration model are an approximate match for that demonstration car, not for a production vehicle. A Volkswagen Polo is listed by generation and body style so the lookup can tell those apart, but no Polo file is published. Supplied body style and variant must both match the same catalogue row. A contradictory pair does not count as a match. The resolver keeps a concept-car illustration in its legacy result for compatibility, but the new showroom does **not render that asset for an unmatched production vehicle**. For a Polo without a licensed matching 3D file, the owner's real photograph takes priority. If no photo has been uploaded, the showroom presents a tasteful empty state and an Edit vehicle action. For a verified demonstration concept car, the model can be launched on demand. When a 3D model is displayed, its Credits link carries the source attribution.

No licensed Polo asset has been added. A real Polo model needs a verified source, generation, and licence before it can be published. Search photos are not a substitute.

Khronos logos inside the sample are trademarks of the Khronos Group. Showing the sample does not mean Khronos endorses this product.

## Match results

`resolveVehicleAsset` is synchronous and local. It returns one of:

- `exact` — the catalogue row has a file for that make, model, year, and body style
- `approximate` — a published file is only a similar body or another year
- `illustrative` — no verified file; the local demonstration model is shown and labelled
- `ambiguous` — more than one body style fits, and none is chosen
- `unavailable` — nothing can be drawn

Loading and failure are viewer states. They are not a search result. The page does not claim a remote model was found.

## New showroom behaviour (2026-10-26)

- The user's actual vehicle photograph is the **default display**. It uses the existing compressed photo (approximately 210 KB maximum data URL), not a new remote download.
- The 3D viewer JavaScript and the GLB are **lazy-loaded on explicit user action** and only if an `exact` or explicitly labelled `approximate` published asset exists. No Three.js canvas is created on a Polo without a published asset.
- The viewer has touch and mouse rotation, keyboard rotation, plus accessible zoom and reset buttons. Canvas and lights are disposed when switching vehicles to avoid leaking GPU resources.
- Unsupported WebGL/model errors restore the real photograph or the empty state without breaking vehicle CRUD, bookings or records.
- The existing ~11.8 MB concept GLB exceeds a sensible default mobile-data budget; it is therefore not fetched automatically. New production assets should target 2–4 MB or less after mesh/texture compression where visual quality permits. Inspect memory/GPU usage on physical low- and mid-range phones; the file-size target alone is not a performance guarantee.
- The viewer displays **representative manufacturer/model assets**, not a scan of an owner's physical vehicle. Dents, trim, aftermarket changes, colour matching and condition cannot be promised from registration alone.

### Adding a verified vehicle model

1. Verify make, model, generation, variant, year and body style against the submitted GLB's source data. A 2021 Polo hatchback is not a Polo Vivo or Polo Sedan.
2. Record a source and commercial-use licence, author attribution, tested model size, and supported material names.
3. Publish the optimised GLB to approved asset storage with compression/caching; use HTTPS, keep credentials server side and never proxy untrusted remote URLs from vehicle data.
4. Add a `VehicleAsset` to `vehicleAssets` in `src/features/garage/vehicleCatalogue.ts`, and set `assetId` on only the actually matched `CatalogueEntry` records. The frontend will expose **Explore in 3D** automatically for published matches.
5. Test on desktop and mobile, including poor network, reduced motion, WebGL disabled, photos-only, multiple vehicles and authenticated mode before merging.


## Future backend

A server can implement the same result shape. It would accept make, model, year, variant, and body style, search only an approved asset list, and return a published file id. If nothing is published, it returns illustrative or unavailable. It must not download the first hit from the public web.

Before a new file is added to the catalogue, a person checks:

- the model is the claimed vehicle, generation, and body style
- the licence allows this use, with attribution kept visible
- the file is a safe glTF or GLB from a known source
- the download size, texture size, and triangle count are acceptable on a phone

API tokens stay on the server. The frontend keeps calling `VehicleAssetResolver` and does not embed secrets.
