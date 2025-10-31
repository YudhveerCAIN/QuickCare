const Comment=require('../models/Comment');
const Issue=require('../models/Issue');

exports.addComment=async(req,res)=>{
    try{
        const {text}=req.body;
        const {issueId}=req.params;

        const issue=await Issue.findById(issueId);
        if(!issue) return res.status(404).json({message:'Issue not found'});
        const comment=await Comment.create({
            text,issueId,userId:req.user._id
        })
        res.status(201).json({message:'comment added',comment})
    } catch (err) {
    res.status(500).json({ message: 'Error adding comment', error: err.message });
    }
};

exports.getComments=async (req,res)=>{
    try{
        const {issueId}=req.params;
        const {needsModeration} = req.query;
        
        let filter = {issueId};
        
        // If needsModeration is true, get comments that need moderation
        if (needsModeration === 'true') {
            filter = {
                ...filter,
                $or: [
                    { isModerated: false },
                    { isFlagged: true },
                    { moderationStatus: { $exists: false } }
                ]
            };
        }
        
        const comments=await Comment.find(filter)
        .populate('userId','name email role')
        .populate('issueId','title')
        .sort({createdAt:-1});
        res.json(comments)
    }catch(err){
        res.status(500).json({ message: 'Error fetching comments', error: err.message });
    }
}

exports.moderateComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { action, reason, moderatedBy } = req.body;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Update comment based on moderation action
        const updateData = {
            isModerated: true,
            moderationStatus: action,
            moderationReason: reason,
            moderatedBy: moderatedBy
        };

        if (action === 'reject') {
            updateData.isDeleted = true;
            updateData.deletedBy = moderatedBy;
        }

        const updatedComment = await Comment.findByIdAndUpdate(
            commentId,
            updateData,
            { new: true }
        ).populate('userId', 'name email role')
         .populate('issueId', 'title');

        res.json({
            message: 'Comment moderated successfully',
            comment: updatedComment
        });
    } catch (err) {
        res.status(500).json({ message: 'Error moderating comment', error: err.message });
    }
};

exports.deleteComment=async (req,res)=>{
    try{
        const {commentId}=req.params;
        
        const comment=await Comment.findById(commentId);
        if(!comment) return res.status(404).json({message:'Comment not found'});
        
        // Check if user owns the comment or is admin
        if(comment.userId.toString()!==req.user._id.toString() && req.user.role!=='admin') {
            return res.status(403).json({message:'You can only delete your own comments'});
        }
        
        await Comment.findByIdAndDelete(commentId);
        res.json({message:'Comment deleted successfully'});
    }catch(err){
        res.status(500).json({ message: 'Error deleting comment', error: err.message });
    }
}