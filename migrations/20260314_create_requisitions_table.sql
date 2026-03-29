-- Create requisitions table for storing equipment requisition forms
CREATE TABLE IF NOT EXISTS requisitions (
  id VARCHAR(50) PRIMARY KEY,
  student_name VARCHAR(255) NOT NULL,
  student_number VARCHAR(100) NOT NULL,
  purpose TEXT NOT NULL,
  instructor VARCHAR(255) NOT NULL,
  program_section VARCHAR(100) NOT NULL,
  course_code VARCHAR(100) NOT NULL,
  room VARCHAR(100) NOT NULL,
  time_of_use VARCHAR(255),
  items JSONB NOT NULL, -- Array of {name, quantity, unit, dateOut, dateIn}
  signatures JSONB, -- Object with {requestedBy, endorsedBy, releasedBy, approvedBy}
  status VARCHAR(50) NOT NULL DEFAULT 'Reserved', -- Reserved, Approved, Released, Completed, Cancelled
  date_out TIMESTAMP NOT NULL,
  date_in TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_requisitions_status ON requisitions(status);
CREATE INDEX IF NOT EXISTS idx_requisitions_created_at ON requisitions(created_at);
CREATE INDEX IF NOT EXISTS idx_requisitions_student_number ON requisitions(student_number);
