import { Project, Member } from '../../models/index.js';
import mongoose from 'mongoose';

const memberResolver = {
  Query: {
    getMembers: async (_, __, context) => {
      if (!context.user) throw new Error('❌ 인증이 필요합니다.');

      try {
        return await Member.find();
      } catch (err) {
        throw new Error('Failed to fetch members');
      }
    },
    getMemberById: async (_, { id }, context) => {
      if (!context.user) throw new Error('❌ 인증이 필요합니다.');

      try {
        const member = await Member.findById(id);
        if (!member) throw new Error('Member not found');
        return member;
      } catch (err) {
        throw new Error('Failed to fetch member');
      }
    },
    getMembersByProject: async (_, { projectId }, context) => {
      if (!context.user) throw new Error('❌ 인증이 필요합니다.');

      try {
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
          throw new Error(`Invalid projectId: ${projectId}`);
        }

        return await Member.find({ projectId }).select(
          '_id email nickname isActive'
        );
      } catch (err) {
        console.error('❌ Failed to get members:', err.message);
        throw new Error(`Failed to get members: ${err.message}`);
      }
    },
  },
  Mutation: {
    createMember: async (
      _,
      { email, nickname, isActive, projectId },
      context
    ) => {
      if (!context.user) throw new Error('❌ 인증이 필요합니다.');

      try {
        console.log('📌 Received Input:', {
          email,
          nickname,
          isActive,
          projectId,
        });

        if (projectId && !mongoose.Types.ObjectId.isValid(projectId)) {
          throw new Error(`Invalid projectId: ${projectId}`);
        }

        const member = new Member({
          email,
          nickname,
          isActive: isActive ?? true, // ✅ 기본값 설정
          projectId: projectId ? new mongoose.Types.ObjectId(projectId) : null, // ✅ projectId 추가
        });

        await member.save();
        console.log('✅ Member created:', member);

        if (projectId) {
          await Project.findByIdAndUpdate(
            projectId,
            { $push: { members: member._id } }, // ✅ Project에도 추가
            { new: true }
          );
        }

        return member;
      } catch (err) {
        console.error('❌ Failed to create member:', err.message);
        throw new Error(`Failed to create member: ${err.message}`);
      }
    },
    updateMember: async (_, { id, email, nickname, isActive }, context) => {
      if (!context.user) throw new Error('❌ 인증이 필요합니다.');

      try {
        const member = await Member.findById(id);
        if (!member) throw new Error('Member not found');

        // ✅ Member 정보 업데이트
        const updatedMember = await Member.findByIdAndUpdate(
          id,
          { email, nickname, isActive },
          { new: true }
        );

        return updatedMember;
      } catch (err) {
        console.error('❌ Failed to update member:', err.message);
        throw new Error('Failed to update member');
      }
    },
    deleteMember: async (_, { id }, context) => {
      if (!context.user) throw new Error('❌ 인증이 필요합니다.');

      try {
        const member = await Member.findById(id);
        if (!member) throw new Error('Member not found');

        // ✅ Project에서 해당 멤버 삭제
        await Project.updateMany({ members: id }, { $pull: { members: id } });

        // ✅ Member 삭제
        await Member.findByIdAndDelete(id);

        return member;
      } catch (err) {
        console.error('❌ Failed to delete member:', err.message);
        throw new Error('Failed to delete member');
      }
    },
  },
};

export default memberResolver;
