ALTER TABLE "user_profiles" ADD CONSTRAINT "user_type_check" CHECK ("user_profiles"."user_type" IN ('learner', 'publisher'));
