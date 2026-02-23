-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "RepoType" AS ENUM ('app', 'aql-db', 'sql-db', 'infra');

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('git-token', 'jira-api-key', 'gcp-service-account', 'generic');

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "team" TEXT NOT NULL,
    "team_email" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_repos" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "repo_url" TEXT NOT NULL,
    "default_branch" TEXT NOT NULL DEFAULT 'master',
    "helm_charts_path" TEXT NOT NULL DEFAULT 'helm-charts',
    "meta_sheet_path" TEXT,
    "is_accessible" BOOLEAN NOT NULL DEFAULT false,
    "last_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_repos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_repos" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "repo_url" TEXT NOT NULL,
    "repo_type" "RepoType" NOT NULL,
    "default_branch" TEXT NOT NULL DEFAULT 'main',
    "helm_values_path" TEXT,
    "is_accessible" BOOLEAN NOT NULL DEFAULT false,
    "last_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_repos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "environments" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "promotion_order" INTEGER NOT NULL,
    "kubernetes_namespace" TEXT,
    "cluster_name" TEXT,
    "values_folder" TEXT NOT NULL,
    "is_production" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "environments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CredentialType" NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_trackers" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "branch_name" TEXT NOT NULL,
    "environment_statuses" JSONB NOT NULL,
    "version" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_trackers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_name_key" ON "projects"("name");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_repos_project_id_key" ON "promotion_repos"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "source_repos_project_id_repo_url_key" ON "source_repos"("project_id", "repo_url");

-- CreateIndex
CREATE UNIQUE INDEX "environments_project_id_name_key" ON "environments"("project_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "environments_project_id_promotion_order_key" ON "environments"("project_id", "promotion_order");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_project_id_name_key" ON "credentials"("project_id", "name");

-- AddForeignKey
ALTER TABLE "promotion_repos" ADD CONSTRAINT "promotion_repos_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_repos" ADD CONSTRAINT "source_repos_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environments" ADD CONSTRAINT "environments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_trackers" ADD CONSTRAINT "branch_trackers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
