# SSM Parameter for JWT secret
resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/changing-500/jwt-secret"
  type  = "SecureString"
  value = "your-secret-jwt-key-change-this-in-production" # Default secret - change manually in AWS console

  tags = local.common_tags
  
  lifecycle {
    ignore_changes = [value]
  }
}
