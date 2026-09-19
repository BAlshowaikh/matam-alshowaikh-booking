/*
  0005_hijri_forward_anchors.sql
  Adds opt-in forward propagation to Hijri corrections so one approved anchor can adjust later dates.
*/

ALTER TABLE "hijri_date_overrides"
ADD COLUMN "apply_forward" boolean DEFAULT false NOT NULL;
