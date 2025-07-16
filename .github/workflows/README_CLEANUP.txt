Removed unused or redundant workflow files:
- frontend-cd.yml (replaced by frontend-pipeline.yml)
- mern-ci-cd.yml (old monolithic workflow, replaced by modular workflows)
- classroom.yml (not needed for your deployment)

Kept only:
- frontend-pipeline.yml (combined CI + CD for frontend)
- backend-ci.yml (backend CI)
- backend-cd.yml (backend CD)
