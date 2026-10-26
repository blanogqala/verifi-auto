import { useState } from 'react';
import { readVehiclePhoto } from '../../features/garage/vehiclePhoto';
import { calendarDateInput } from '../../features/garage/vehicleDates';
import { PaintColourField } from './PaintColourField';
import { bodyStyleOptions } from '../../features/garage/vehicleCatalogue';

/** One field layout for both the demo and authenticated vehicle forms. */
export function VehicleFields({ vehicle }: { vehicle?: any }) {
  const [photo, setPhoto] = useState<string>(vehicle?.photo || '');
  const [working, setWorking] = useState(false);
  const [photoError, setPhotoError] = useState('');
  return (
    <>
      <div className="form-row">
        <label>
          Make
          <input name="make" required autoComplete="off" defaultValue={vehicle?.make} />
        </label>
        <label>
          Model (vehicle name)
          <input name="model" required autoComplete="off" placeholder="e.g. Polo, Corolla, Hilux" defaultValue={vehicle?.model} />
        </label>
      </div>
      <div className="form-row">
        <label>
          Body style
          <select name="bodyStyle" defaultValue={vehicle?.bodyStyle || ''}>
            <option value="">Not specified</option>
            {bodyStyleOptions.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </label>
        <label>
          Variant
          <input name="variant" defaultValue={vehicle?.variant || ''} />
        </label>
      </div>
      <PaintColourField
        key={vehicle?.id || 'new'}
        color={vehicle?.paintColor}
        name={vehicle?.paintColorName}
      />
      <div className="form-row">
        <label>
          Model year
          <input
            name="year"
            type="number"
            inputMode="numeric"
            autoComplete="off"
            min="1900"
            max={new Date().getFullYear() + 1}
            required
            placeholder="e.g. 2022"
            defaultValue={vehicle?.year ?? ''}
          />
        </label>
        <label>
          Mileage (km)
          <input
            name="mileage"
            type="number"
            inputMode="numeric"
            autoComplete="off"
            min="0"
            max="5000000"
            required
            defaultValue={vehicle?.mileage || 0}
          />
        </label>
      </div>
      <p className="muted garage-field-hint">
        Model is the vehicle name (for example Polo); model year is the year of that version.
        Mileage records kilometres travelled, not vehicle age.
      </p>
      <section className="garage-photo-picker" aria-label="Photo of your vehicle">
        <div className="garage-photo-picker-header">
          <div>
            <strong>Your vehicle's photograph</strong>
            <p className="muted">Optional · Upload a real picture of your car. It is saved privately with this vehicle.</p>
          </div>
          {photo && <button type="button" className="secondary" onClick={() => {
            setPhoto('');
            setPhotoError('');
          }}>Remove photo</button>}
        </div>
        <input name="photo" type="hidden" value={photo} />
        <label>
          Choose vehicle photo
          <input
            type="file"
            name="vehiclePhotoFile"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Choose vehicle photo"
            data-vehicle-photo-working={working ? 'true' : 'false'}
            disabled={working}
            onChange={async (event) => {
              const chosen = event.currentTarget.files?.[0];
              if (!chosen) return;
              setWorking(true);
              setPhotoError('');
              try {
                setPhoto(await readVehiclePhoto(chosen));
              } catch (error: any) {
                setPhotoError(error?.message || 'Could not prepare this vehicle photo.');
              } finally {
                setWorking(false);
              }
            }}
          />
        </label>
        {working && <p role="status">Preparing your car photo…</p>}
        {photoError && <p className="form-error" role="alert">{photoError}</p>}
        {photo && <img className="garage-photo-preview" src={photo} alt="Preview of your car photograph" />}
        {!photo && <p className="muted garage-field-hint">
          No actual vehicle photo yet. We only show a verified matching reference image when one is available.
        </p>}
      </section>
      <label>
        Registration
        <input
          name="registration"
          required
          autoComplete="off"
          defaultValue={vehicle?.registration || ''}
        />
      </label>
      <div className="form-row">
        <label>
          Licence disc expiry
          <input
            name="licenceDiscExpiry"
            type="date"
            defaultValue={calendarDateInput(vehicle?.licenceDiscExpiry)}
          />
        </label>
        <label>
          Who recorded the licence date
          <select name="licenceDiscSource" defaultValue={vehicle?.licenceDiscSource || 'owner'}>
            <option value="owner">Entered by the owner</option>
            <option value="mechanic">Recorded by a mechanic</option>
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>
          Next service date
          <input
            name="nextServiceDate"
            type="date"
            defaultValue={calendarDateInput(vehicle?.nextServiceDate)}
          />
        </label>
        <label>
          Next service mileage
          <input
            name="nextServiceMileage"
            type="number"
            min="0"
            defaultValue={vehicle?.nextServiceMileage || ''}
          />
        </label>
      </div>
      <label>
        Who recorded the next service
        <select name="nextServiceSource" defaultValue={vehicle?.nextServiceSource || 'owner'}>
          <option value="owner">Entered by the owner</option>
          <option value="mechanic">Recorded by a mechanic</option>
        </select>
      </label>
      <p className="muted">
        Leave a date blank when it has not been recorded. No service interval is assumed.
      </p>
    </>
  );
}
