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

# Twilio credentials (set real values in AWS console; Terraform ignores changes)
resource "aws_ssm_parameter" "twilio_account_sid" {
  name  = "/changing-500/twilio/account_sid"
  type  = "SecureString"
  value = "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" # placeholder

  tags = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "twilio_auth_token" {
  name  = "/changing-500/twilio/auth_token"
  type  = "SecureString"
  value = "your_twilio_auth_token" # placeholder

  tags = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "twilio_from_number" {
  name  = "/changing-500/twilio/from_number"
  type  = "String"
  value = "+15555555555" # placeholder

  tags = local.common_tags

  lifecycle {
    ignore_changes = [value]
  }
}
